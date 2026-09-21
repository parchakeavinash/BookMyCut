-- ================================================================
-- BarberQ — Migration 003: Row Level Security Policies
-- Run AFTER 001 and 002.
-- ================================================================

-- ================================================================
-- USERS
-- ================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users read own profile; shopkeeper/admin can read customer basics
CREATE POLICY "users_read"
    ON users FOR SELECT
    USING (
        auth.uid() = id
        OR (auth.jwt() ->> 'role') IN ('shopkeeper', 'admin')
    );

-- Users update only their own profile
CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- ================================================================
-- SHOPS
-- ================================================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- All active shops are publicly readable (discovery)
CREATE POLICY "shops_read_active"
    ON shops FOR SELECT
    USING (is_active = true);

-- Admin reads all shops including inactive
CREATE POLICY "shops_admin_read_all"
    ON shops FOR SELECT
    USING ((auth.jwt() ->> 'role') = 'admin');

-- Shopkeepers can create a shop (owner_id must match their user id)
CREATE POLICY "shops_insert"
    ON shops FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id
        AND (auth.jwt() ->> 'role') = 'shopkeeper'
    );

-- Shop owner can update/delete their own shop
CREATE POLICY "shops_owner_write"
    ON shops FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shops_owner_delete"
    ON shops FOR DELETE
    USING (auth.uid() = owner_id);

-- ================================================================
-- SHOP IMAGES
-- ================================================================
ALTER TABLE shop_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_images_read"
    ON shop_images FOR SELECT USING (true);

CREATE POLICY "shop_images_write"
    ON shop_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = shop_images.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- SERVICES
-- ================================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_read_active"
    ON services FOR SELECT USING (is_active = true);

CREATE POLICY "services_owner_write"
    ON services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = services.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- STAFF
-- ================================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_active"
    ON staff FOR SELECT USING (is_active = true);

CREATE POLICY "staff_owner_write"
    ON staff FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = staff.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- STAFF SERVICES
-- ================================================================
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_services_read"
    ON staff_services FOR SELECT USING (true);

CREATE POLICY "staff_services_write"
    ON staff_services FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN shops sh ON sh.id = s.shop_id
            WHERE s.id = staff_services.staff_id
              AND sh.owner_id = auth.uid()
        )
    );

-- ================================================================
-- BUSINESS HOURS
-- ================================================================
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_hours_read"
    ON business_hours FOR SELECT USING (true);

CREATE POLICY "biz_hours_owner_write"
    ON business_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = business_hours.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- BUSINESS BREAKS
-- ================================================================
ALTER TABLE business_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_breaks_read"
    ON business_breaks FOR SELECT USING (true);

CREATE POLICY "biz_breaks_owner_write"
    ON business_breaks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = business_breaks.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- SHOP CLOSED DATES
-- ================================================================
ALTER TABLE shop_closed_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closed_dates_read"
    ON shop_closed_dates FOR SELECT USING (true);

CREATE POLICY "closed_dates_owner_write"
    ON shop_closed_dates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = shop_closed_dates.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- STAFF HOURS
-- ================================================================
ALTER TABLE staff_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_hours_read"
    ON staff_hours FOR SELECT USING (true);

CREATE POLICY "staff_hours_owner_write"
    ON staff_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN shops sh ON sh.id = s.shop_id
            WHERE s.id = staff_hours.staff_id
              AND sh.owner_id = auth.uid()
        )
    );

-- ================================================================
-- STAFF DAYS OFF
-- ================================================================
ALTER TABLE staff_days_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_days_off_read"
    ON staff_days_off FOR SELECT USING (true);

CREATE POLICY "staff_days_off_owner_write"
    ON staff_days_off FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN shops sh ON sh.id = s.shop_id
            WHERE s.id = staff_days_off.staff_id
              AND sh.owner_id = auth.uid()
        )
    );

-- ================================================================
-- BOOKINGS
-- ================================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Customer sees own bookings
CREATE POLICY "bookings_customer_read"
    ON bookings FOR SELECT
    USING (auth.uid() = customer_id);

-- Shopkeeper sees all bookings for their shop
CREATE POLICY "bookings_shopkeeper_read"
    ON bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = bookings.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- Admin sees all
CREATE POLICY "bookings_admin_read"
    ON bookings FOR SELECT
    USING ((auth.jwt() ->> 'role') = 'admin');

-- Booking insertion is handled by the create_booking() DB function
-- (called via RPC/Edge Function). Direct insert requires:
CREATE POLICY "bookings_customer_insert"
    ON bookings FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Customer can cancel their own confirmed booking
CREATE POLICY "bookings_customer_cancel"
    ON bookings FOR UPDATE
    USING (
        auth.uid() = customer_id
        AND status = 'confirmed'
    )
    WITH CHECK (
        status = 'cancelled'
        AND cancelled_by = 'customer'
    );

-- Shopkeeper can update bookings for their shop
-- (complete, cancel, mark no-show)
CREATE POLICY "bookings_shopkeeper_update"
    ON bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shops
            WHERE shops.id = bookings.shop_id
              AND shops.owner_id = auth.uid()
        )
    );

-- ================================================================
-- NOTIFICATIONS
-- ================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_read_own"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) can insert notifications
CREATE POLICY "notifications_service_insert"
    ON notifications FOR INSERT
    WITH CHECK (true);  -- controlled by service_role key in Edge Functions
