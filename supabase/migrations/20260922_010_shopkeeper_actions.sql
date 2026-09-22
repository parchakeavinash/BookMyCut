-- ================================================================
-- BarberQ — Migration 010: Shopkeeper Booking Actions & Permissions
-- Adds complete_booking, mark_no_show RPCs and updates RLS policies.
-- ================================================================

-- 1. RPC: complete_booking
-- Marks confirmed booking as completed, sets completed_at, and verifies ownership.
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
    v_booking bookings%ROWTYPE;
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
    IF NOT EXISTS (
        SELECT 1 FROM shops WHERE id = v_booking.shop_id AND owner_id = p_actor_id
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: only the shop owner can complete bookings';
    END IF;

    UPDATE bookings
    SET status       = 'completed',
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    RETURN v_booking;
END;
$$;

-- 2. RPC: mark_no_show
-- Marks confirmed booking as no_show, sets cancellation_reason, increments users.no_show_count.
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
    v_booking bookings%ROWTYPE;
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
    IF NOT EXISTS (
        SELECT 1 FROM shops WHERE id = v_booking.shop_id AND owner_id = p_actor_id
    ) THEN
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

    RETURN v_booking;
END;
$$;

-- 3. RLS: Ensure shopkeepers can read customer details for bookings in their shops
DROP POLICY IF EXISTS "users_read" ON users;
CREATE POLICY "users_read"
    ON users FOR SELECT
    USING (
        auth.uid() = id
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('shopkeeper', 'admin')
        OR (auth.jwt() ->> 'role') IN ('shopkeeper', 'admin')
        OR EXISTS (
            SELECT 1 FROM bookings b
            JOIN shops s ON s.id = b.shop_id
            WHERE b.customer_id = users.id AND s.owner_id = auth.uid()
        )
    );

-- 4. RLS: Ensure shopkeeper can update bookings belonging to their shops
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

-- 5. Grant execute on RPCs
GRANT EXECUTE ON FUNCTION complete_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_no_show(UUID, UUID, TEXT) TO authenticated;
