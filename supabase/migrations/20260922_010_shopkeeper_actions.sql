-- ================================================================
-- BarberQ — Migration 010: Shopkeeper Booking Actions & Notifications
-- Adds complete_booking, mark_no_show, confirm_booking RPCs,
-- automated notification triggers for customer & shopkeeper,
-- and updates RLS policies.
-- ================================================================

-- 1. RPC: complete_booking
-- Marks confirmed booking as completed, sets completed_at, verifies ownership,
-- and inserts a completion notification for the customer.
CREATE OR REPLACE FUNCTION complete_booking(
    p_booking_id  UUID,
    p_actor_id    UUID
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking  bookings%ROWTYPE;
    v_shop_name TEXT;
BEGIN
    -- Require authenticated user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: actor_id mismatch';
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND status = 'confirmed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND_OR_NOT_ACTIVE';
    END IF;

    -- Verify actor is owner of the shop
    SELECT name INTO v_shop_name
    FROM shops
    WHERE id = v_booking.shop_id AND owner_id = p_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UNAUTHORIZED: only the shop owner can complete bookings';
    END IF;

    UPDATE bookings
    SET status       = 'completed',
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- Insert thank-you notification for customer
    INSERT INTO notifications (
        user_id,
        booking_id,
        type,
        title,
        body,
        data
    ) VALUES (
        v_booking.customer_id,
        v_booking.id,
        'booking_completed',
        'Thank You for Visiting! ✂️',
        'Your appointment at ' || v_shop_name || ' for ' || v_booking.service_name || ' is complete. We hope you loved your cut!',
        jsonb_build_object(
            'shop_id', v_booking.shop_id,
            'booking_id', v_booking.id,
            'service_name', v_booking.service_name
        )
    );

    RETURN v_booking;
END;
$$;

-- 2. RPC: mark_no_show
-- Marks confirmed booking as no_show, sets cancellation_reason,
-- increments users.no_show_count, and notifies customer.
CREATE OR REPLACE FUNCTION mark_no_show(
    p_booking_id  UUID,
    p_actor_id    UUID,
    p_reason      TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking   bookings%ROWTYPE;
    v_shop_name TEXT;
BEGIN
    -- Require authenticated user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: actor_id mismatch';
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND status = 'confirmed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND_OR_NOT_ACTIVE';
    END IF;

    -- Verify actor is owner of the shop
    SELECT name INTO v_shop_name
    FROM shops
    WHERE id = v_booking.shop_id AND owner_id = p_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UNAUTHORIZED: only the shop owner can mark no-show';
    END IF;

    UPDATE bookings
    SET status              = 'no_show',
        cancellation_reason = COALESCE(p_reason, 'Customer did not show up'),
        updated_at          = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- Increment customer's no_show_count in users table
    UPDATE users
    SET no_show_count = no_show_count + 1,
        updated_at    = NOW()
    WHERE id = v_booking.customer_id;

    -- Insert missed appointment notification for customer
    INSERT INTO notifications (
        user_id,
        booking_id,
        type,
        title,
        body,
        data
    ) VALUES (
        v_booking.customer_id,
        v_booking.id,
        'booking_no_show',
        'Missed Appointment ⚠️',
        'You were marked as no-show for your appointment at ' || v_shop_name || '.',
        jsonb_build_object(
            'shop_id', v_booking.shop_id,
            'booking_id', v_booking.id
        )
    );

    RETURN v_booking;
END;
$$;

-- 3. RPC: confirm_booking
-- Confirms a booking and sends a confirmation notification to customer.
CREATE OR REPLACE FUNCTION confirm_booking(
    p_booking_id  UUID,
    p_actor_id    UUID
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking   bookings%ROWTYPE;
    v_shop_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: actor_id mismatch';
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND';
    END IF;

    SELECT name INTO v_shop_name
    FROM shops
    WHERE id = v_booking.shop_id AND owner_id = p_actor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UNAUTHORIZED: only the shop owner can confirm bookings';
    END IF;

    UPDATE bookings
    SET status     = 'confirmed',
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- Insert confirmation notification for customer
    INSERT INTO notifications (
        user_id,
        booking_id,
        type,
        title,
        body,
        data
    ) VALUES (
        v_booking.customer_id,
        v_booking.id,
        'booking_confirmed',
        'Appointment Confirmed! 💈',
        'Your appointment at ' || v_shop_name || ' for ' || v_booking.service_name || ' has been confirmed by the salon.',
        jsonb_build_object(
            'shop_id', v_booking.shop_id,
            'booking_id', v_booking.id
        )
    );

    RETURN v_booking;
END;
$$;

-- 4. Update cancel_booking to trigger notifications
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id  UUID,
    p_actor_id    UUID,
    p_actor_role  TEXT,
    p_reason      TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking   bookings%ROWTYPE;
    v_shop_name TEXT;
    v_shop_owner_id UUID;
    v_customer_name TEXT;
BEGIN
    -- REQUIRE authenticated user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: actor_id mismatch';
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND status = 'confirmed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BOOKING_NOT_FOUND_OR_NOT_CANCELLABLE';
    END IF;

    SELECT name, owner_id INTO v_shop_name, v_shop_owner_id
    FROM shops
    WHERE id = v_booking.shop_id;

    SELECT full_name INTO v_customer_name
    FROM users
    WHERE id = v_booking.customer_id;

    IF p_actor_role = 'customer' AND v_booking.customer_id != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_actor_role = 'shopkeeper' AND v_shop_owner_id != p_actor_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    UPDATE bookings
    SET status              = 'cancelled',
        cancelled_by        = p_actor_role,
        cancellation_reason = p_reason,
        cancelled_at        = NOW(),
        updated_at          = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    -- If cancelled by shopkeeper: notify customer
    IF p_actor_role = 'shopkeeper' THEN
        INSERT INTO notifications (
            user_id,
            booking_id,
            type,
            title,
            body,
            data
        ) VALUES (
            v_booking.customer_id,
            v_booking.id,
            'booking_cancelled',
            'Appointment Cancelled',
            'Your appointment at ' || v_shop_name || ' was cancelled by the salon: ' || COALESCE(p_reason, 'Schedule conflict'),
            jsonb_build_object(
                'shop_id', v_booking.shop_id,
                'booking_id', v_booking.id,
                'cancelled_by', 'shopkeeper',
                'reason', p_reason
            )
        );
    END IF;

    -- If cancelled by customer: notify shopkeeper
    IF p_actor_role = 'customer' THEN
        INSERT INTO notifications (
            user_id,
            booking_id,
            type,
            title,
            body,
            data
        ) VALUES (
            v_shop_owner_id,
            v_booking.id,
            'booking_cancelled',
            'Customer Cancellation ✕',
            COALESCE(v_customer_name, 'A customer') || ' cancelled their appointment for ' || v_booking.service_name || '.',
            jsonb_build_object(
                'shop_id', v_booking.shop_id,
                'booking_id', v_booking.id,
                'cancelled_by', 'customer',
                'reason', p_reason
            )
        );
    END IF;

    RETURN v_booking;
END;
$$;

-- 5. Trigger on bookings INSERT: Notify Shopkeeper of new booking instantly
CREATE OR REPLACE FUNCTION notify_shopkeeper_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shop_owner_id UUID;
    v_customer_name TEXT;
BEGIN
    SELECT owner_id INTO v_shop_owner_id
    FROM shops
    WHERE id = NEW.shop_id;

    SELECT full_name INTO v_customer_name
    FROM users
    WHERE id = NEW.customer_id;

    IF v_shop_owner_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            booking_id,
            type,
            title,
            body,
            data
        ) VALUES (
            v_shop_owner_id,
            NEW.id,
            'new_booking',
            'New Appointment Booked! 💈',
            COALESCE(v_customer_name, 'A customer') || ' booked ' || NEW.service_name || ' at ' || to_char(NEW.start_time, 'HH12:MI AM on Mon DD'),
            jsonb_build_object(
                'shop_id', NEW.shop_id,
                'booking_id', NEW.id,
                'customer_id', NEW.customer_id,
                'service_name', NEW.service_name,
                'start_time', NEW.start_time
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_shopkeeper_on_booking ON bookings;
CREATE TRIGGER trg_notify_shopkeeper_on_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_shopkeeper_on_booking();

-- 6. Helper to bypass RLS recursion on users table
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$;

-- RLS: Ensure users can read their own profile, and shopkeepers/admins can read customer details
DROP POLICY IF EXISTS "users_read" ON users;
CREATE POLICY "users_read"
    ON users FOR SELECT
    USING (
        auth.uid() = id
        OR get_my_role() IN ('shopkeeper', 'admin')
        OR (auth.jwt() ->> 'role') IN ('shopkeeper', 'admin')
    );

-- 7. RLS: Ensure shopkeeper can update bookings belonging to their shops
DROP POLICY IF EXISTS "bookings_shopkeeper_update" ON bookings;
CREATE POLICY "bookings_shopkeeper_update"
    ON bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = bookings.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_no_show(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, UUID, TEXT, TEXT) TO authenticated;
