-- ================================================================
-- BarberQ — Migration 002: Core Database Functions
-- Availability engine + atomic booking creation
-- Run AFTER 001_schema.sql
-- ================================================================

-- ================================================================
-- FUNCTION: is_staff_available
-- Returns true if a staff member has no overlapping active booking
-- in the given time window.
-- ================================================================
CREATE OR REPLACE FUNCTION is_staff_available(
    p_staff_id           UUID,
    p_start_time         TIMESTAMPTZ,
    p_end_time           TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE staff_id = p_staff_id
          AND status NOT IN ('cancelled')
          AND (
              p_exclude_booking_id IS NULL
              OR id != p_exclude_booking_id
          )
          AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );
$$;

-- ================================================================
-- FUNCTION: find_available_staff
-- Auto-assigns the best available staff member for a service
-- at a given time. "Best" = fewest bookings today (load-balance).
-- Returns NULL if no staff available.
-- ================================================================
CREATE OR REPLACE FUNCTION find_available_staff(
    p_shop_id     UUID,
    p_service_id  UUID,
    p_start_time  TIMESTAMPTZ,
    p_end_time    TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT s.id
    FROM staff s
    JOIN staff_services ss
        ON ss.staff_id = s.id
        AND ss.service_id = p_service_id
    WHERE s.shop_id = p_shop_id
      AND s.is_active = true
      -- No overlap with existing bookings
      AND is_staff_available(s.id, p_start_time, p_end_time)
      -- Not on a day off for this date
      AND NOT EXISTS (
          SELECT 1 FROM staff_days_off sdo
          WHERE sdo.staff_id = s.id
            AND sdo.off_date = (p_start_time AT TIME ZONE 'Asia/Kolkata')::date
      )
      -- Not set to non-working for this day of week
      AND NOT EXISTS (
          SELECT 1 FROM staff_hours sh
          WHERE sh.staff_id = s.id
            AND sh.day_of_week = EXTRACT(
                DOW FROM (p_start_time AT TIME ZONE 'Asia/Kolkata')
            )::int
            AND sh.is_working = false
      )
    ORDER BY (
        -- Load-balance: prefer staff with fewer bookings today
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.staff_id = s.id
          AND (b.start_time AT TIME ZONE 'Asia/Kolkata')::date =
              (p_start_time AT TIME ZONE 'Asia/Kolkata')::date
          AND b.status NOT IN ('cancelled')
    ) ASC
    LIMIT 1;
$$;

-- ================================================================
-- FUNCTION: get_available_slots
-- Computes available appointment start times for a shop/service/date.
-- Called as an RPC from Supabase client or Edge Function.
--
-- Returns rows of (slot_time, available_staff_count).
-- slot_time is TIMESTAMPTZ in UTC.
-- ================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
    p_shop_id    UUID,
    p_service_id UUID,
    p_date       DATE,
    p_staff_id   UUID DEFAULT NULL
)
RETURNS TABLE(slot_time TIMESTAMPTZ, available_staff_count INT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_shop          shops%ROWTYPE;
    v_service       services%ROWTYPE;
    v_day_of_week   INT;
    v_hours         business_hours%ROWTYPE;
    v_open_dt       TIMESTAMPTZ;
    v_close_dt      TIMESTAMPTZ;
    v_cursor        TIMESTAMPTZ;
    v_slot_end      TIMESTAMPTZ;
    v_now           TIMESTAMPTZ := NOW();
    v_staff_count   INT;
BEGIN
    -- Load shop
    SELECT * INTO v_shop
    FROM shops
    WHERE id = p_shop_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Load service
    SELECT * INTO v_service
    FROM services
    WHERE id = p_service_id AND shop_id = p_shop_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check if shop has a special closure on this date
    IF EXISTS (
        SELECT 1 FROM shop_closed_dates
        WHERE shop_id = p_shop_id AND closed_date = p_date
    ) THEN
        RETURN;
    END IF;

    -- Get day of week (0=Sunday … 6=Saturday) in shop timezone
    v_day_of_week := EXTRACT(
        DOW FROM (p_date::text || ' 12:00:00')::TIMESTAMPTZ AT TIME ZONE v_shop.timezone
    )::INT;

    -- Get business hours for this day
    SELECT * INTO v_hours
    FROM business_hours
    WHERE shop_id = p_shop_id AND day_of_week = v_day_of_week;

    -- If no hours record or shop is closed this day, return empty
    IF NOT FOUND OR NOT v_hours.is_open THEN
        RETURN;
    END IF;

    -- Convert open/close times to TIMESTAMPTZ boundaries in shop timezone
    v_open_dt := (p_date::text || ' ' || v_hours.open_time::text)::TIMESTAMPTZ
                 AT TIME ZONE v_shop.timezone;
    v_close_dt := (p_date::text || ' ' || v_hours.close_time::text)::TIMESTAMPTZ
                  AT TIME ZONE v_shop.timezone;

    -- Iterate candidate slot windows
    v_cursor := v_open_dt;

    WHILE v_cursor + (v_service.duration_mins || ' minutes')::INTERVAL <= v_close_dt LOOP
        v_slot_end := v_cursor + (v_service.duration_mins || ' minutes')::INTERVAL;

        -- Skip slots too soon (below min advance booking time)
        IF v_cursor < v_now + (v_shop.min_advance_booking_mins || ' minutes')::INTERVAL THEN
            v_cursor := v_cursor + (v_shop.slot_step_mins || ' minutes')::INTERVAL;
            CONTINUE;
        END IF;

        -- Skip slots that overlap a shop break
        IF EXISTS (
            SELECT 1 FROM business_breaks bb
            WHERE bb.shop_id = p_shop_id
              AND (bb.day_of_week IS NULL OR bb.day_of_week = v_day_of_week)
              AND (
                  (p_date::text || ' ' || bb.start_time::text)::TIMESTAMPTZ
                      AT TIME ZONE v_shop.timezone,
                  (p_date::text || ' ' || bb.end_time::text)::TIMESTAMPTZ
                      AT TIME ZONE v_shop.timezone
              ) OVERLAPS (v_cursor, v_slot_end)
        ) THEN
            v_cursor := v_cursor + (v_shop.slot_step_mins || ' minutes')::INTERVAL;
            CONTINUE;
        END IF;

        -- Count available staff for this slot
        IF p_staff_id IS NOT NULL THEN
            -- Specific staff member requested
            SELECT COUNT(*) INTO v_staff_count
            FROM staff s
            JOIN staff_services ss
                ON ss.staff_id = s.id AND ss.service_id = p_service_id
            WHERE s.id = p_staff_id
              AND s.shop_id = p_shop_id
              AND s.is_active = true
              AND is_staff_available(s.id, v_cursor, v_slot_end)
              AND NOT EXISTS (
                  SELECT 1 FROM staff_days_off
                  WHERE staff_id = s.id AND off_date = p_date
              )
              AND NOT EXISTS (
                  SELECT 1 FROM staff_hours sh
                  WHERE sh.staff_id = s.id
                    AND sh.day_of_week = v_day_of_week
                    AND sh.is_working = false
              );
        ELSE
            -- Any available staff
            SELECT COUNT(*) INTO v_staff_count
            FROM staff s
            JOIN staff_services ss
                ON ss.staff_id = s.id AND ss.service_id = p_service_id
            WHERE s.shop_id = p_shop_id
              AND s.is_active = true
              AND is_staff_available(s.id, v_cursor, v_slot_end)
              AND NOT EXISTS (
                  SELECT 1 FROM staff_days_off
                  WHERE staff_id = s.id AND off_date = p_date
              )
              AND NOT EXISTS (
                  SELECT 1 FROM staff_hours sh
                  WHERE sh.staff_id = s.id
                    AND sh.day_of_week = v_day_of_week
                    AND sh.is_working = false
              );
        END IF;

        IF v_staff_count > 0 THEN
            slot_time := v_cursor;
            available_staff_count := v_staff_count;
            RETURN NEXT;
        END IF;

        v_cursor := v_cursor + (v_shop.slot_step_mins || ' minutes')::INTERVAL;
    END LOOP;
END;
$$;

-- ================================================================
-- FUNCTION: create_booking
-- Atomically creates a booking with double-booking protection.
-- Uses pg_advisory_xact_lock to prevent race conditions.
--
-- Pass p_staff_id = NULL for auto-assignment.
-- Raises exceptions on failure:
--   'SERVICE_NOT_FOUND'  — service doesn't exist/inactive
--   'NO_STAFF_AVAILABLE' — no staff can take this slot
--   'SLOT_UNAVAILABLE'   — chosen staff already has conflicting booking
-- ================================================================
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
AS $$
DECLARE
    v_service        services%ROWTYPE;
    v_end_time       TIMESTAMPTZ;
    v_assigned_staff UUID;
    v_staff_name     VARCHAR(100);
    v_booking        bookings%ROWTYPE;
    v_lock_key       BIGINT;
BEGIN
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

-- ================================================================
-- FUNCTION: reschedule_booking
-- Atomically cancels old booking and creates a new one.
-- ================================================================
CREATE OR REPLACE FUNCTION reschedule_booking(
    p_booking_id    UUID,
    p_customer_id   UUID,
    p_new_start     TIMESTAMPTZ,
    p_new_staff_id  UUID DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_booking  bookings%ROWTYPE;
    v_new_booking  bookings%ROWTYPE;
BEGIN
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

-- ================================================================
-- FUNCTION: cancel_booking
-- Cancels a booking. Validates ownership and status.
-- ================================================================
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id  UUID,
    p_actor_id    UUID,
    p_actor_role  TEXT,  -- 'customer' | 'shopkeeper'
    p_reason      TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
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
