-- ================================================================
-- BarberQ — Migration 006: Update Booking Engine Functions with SECURITY DEFINER
-- Allows create_booking, reschedule_booking, and cancel_booking
-- to execute atomic transactional logic without RLS permission errors.
-- Run in Supabase SQL Editor.
-- ================================================================

-- 1. create_booking with SECURITY DEFINER & caller verification
CREATE OR REPLACE FUNCTION create_booking(
    p_customer_id   UUID,
    p_shop_id       UUID,
    p_service_id    UUID,
    p_staff_id      UUID,
    p_start_time    TIMESTAMPTZ,
    p_customer_note TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_service        services%ROWTYPE;
    v_end_time       TIMESTAMPTZ;
    v_assigned_staff UUID;
    v_staff_name     VARCHAR(100);
    v_booking        bookings%ROWTYPE;
    v_lock_key       BIGINT;
BEGIN
    -- Authorization check: If called by an authenticated user, ensure they can only book for themselves
    IF auth.uid() IS NOT NULL AND auth.uid() != p_customer_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    -- 1. Validate and load service
    SELECT * INTO v_service
    FROM services
    WHERE id = p_service_id
      AND shop_id = p_shop_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SERVICE_NOT_FOUND';
    END IF;

    v_end_time := p_start_time + (v_service.duration_mins || ' minutes')::INTERVAL;

    -- 2. Resolve staff assignment
    IF p_staff_id IS NULL THEN
        -- Auto-assign: find best available staff
        v_assigned_staff := find_available_staff(
            p_shop_id, p_service_id, p_start_time, v_end_time
        );
        IF v_assigned_staff IS NULL THEN
            RAISE EXCEPTION 'NO_STAFF_AVAILABLE';
        END IF;
    ELSE
        v_assigned_staff := p_staff_id;
    END IF;

    -- 3. Acquire advisory lock scoped to this transaction.
    --    Two transactions locking same key will serialize.
    --    Lock is automatically released on commit/rollback.
    v_lock_key := hashtext(v_assigned_staff::text || extract(epoch from p_start_time)::text);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 4. Re-check availability INSIDE the lock (prevents TOCTOU race condition)
    IF NOT is_staff_available(v_assigned_staff, p_start_time, v_end_time) THEN
        RAISE EXCEPTION 'SLOT_UNAVAILABLE';
    END IF;

    -- 5. Get staff name for snapshot
    SELECT name INTO v_staff_name
    FROM staff
    WHERE id = v_assigned_staff;

    -- 6. Insert the confirmed booking
    INSERT INTO bookings (
        customer_id,
        shop_id,
        staff_id,
        service_id,
        service_name,
        service_price,
        service_duration_mins,
        staff_name,
        start_time,
        end_time,
        status,
        customer_note
    )
    VALUES (
        p_customer_id,
        p_shop_id,
        v_assigned_staff,
        p_service_id,
        v_service.name,
        v_service.price,
        v_service.duration_mins,
        v_staff_name,
        p_start_time,
        v_end_time,
        'confirmed',
        p_customer_note
    )
    RETURNING * INTO v_booking;

    RETURN v_booking;
END;
$$;

-- 2. reschedule_booking with SECURITY DEFINER
CREATE OR REPLACE FUNCTION reschedule_booking(
    p_booking_id    UUID,
    p_customer_id   UUID,
    p_new_start     TIMESTAMPTZ,
    p_new_staff_id  UUID DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_booking  bookings%ROWTYPE;
    v_new_booking  bookings%ROWTYPE;
BEGIN
    -- Authorization check: If called by an authenticated user, ensure they own the booking
    IF auth.uid() IS NOT NULL AND auth.uid() != p_customer_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    -- Load and validate original booking
    SELECT * INTO v_old_booking
    FROM bookings
    WHERE id = p_booking_id
      AND customer_id = p_customer_id
      AND status = 'confirmed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND_OR_NOT_CANCELLABLE';
    END IF;

    -- Cancel original booking
    UPDATE bookings
    SET status        = 'cancelled',
        cancelled_by  = 'customer',
        cancellation_reason = 'rescheduled',
        cancelled_at  = NOW()
    WHERE id = p_booking_id;

    -- Create new booking (uses same atomic logic)
    v_new_booking := create_booking(
        p_customer_id,
        v_old_booking.shop_id,
        v_old_booking.service_id,
        COALESCE(p_new_staff_id, v_old_booking.staff_id),
        p_new_start,
        v_old_booking.customer_note
    );

    -- Link to original
    UPDATE bookings
    SET rescheduled_from_id = p_booking_id
    WHERE id = v_new_booking.id;

    SELECT * INTO v_new_booking FROM bookings WHERE id = v_new_booking.id;
    RETURN v_new_booking;
END;
$$;

-- 3. cancel_booking with SECURITY DEFINER
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id  UUID,
    p_actor_id    UUID,
    p_actor_role  TEXT,  -- 'customer' | 'shopkeeper'
    p_reason      TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    -- Authorization check: If called by an authenticated user, ensure they match actor
    IF auth.uid() IS NOT NULL AND auth.uid() != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND status = 'confirmed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND_OR_NOT_CANCELLABLE';
    END IF;

    -- Validate actor has permission
    IF p_actor_role = 'customer' AND v_booking.customer_id != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_actor_role = 'shopkeeper' THEN
        IF NOT EXISTS (
            SELECT 1 FROM shops WHERE id = v_booking.shop_id AND owner_id = p_actor_id
        ) THEN
            RAISE EXCEPTION 'UNAUTHORIZED';
        END IF;
    END IF;

    UPDATE bookings
    SET status              = 'cancelled',
        cancelled_by        = p_actor_role,
        cancellation_reason = p_reason,
        cancelled_at        = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    RETURN v_booking;
END;
$$;
