-- ================================================================
-- BarberQ — Migration 011: Automated Reminders & Notifications Engine
-- Adds reminder scheduling function, read status RPCs, and cron support.
-- ================================================================

-- 1. RPC: process_booking_reminders
-- Scans upcoming confirmed bookings and dispatches 30-minute and 24-hour reminders.
-- Can be called by pg_cron, Supabase Edge Functions, or background workers.
CREATE OR REPLACE FUNCTION process_booking_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_30m_count INT := 0;
    v_24h_count INT := 0;
    v_booking RECORD;
BEGIN
    -- 1. Process 30-minute reminders (start_time between 25 and 35 minutes from now)
    FOR v_booking IN
        SELECT 
            b.id AS booking_id,
            b.customer_id,
            b.shop_id,
            b.service_name,
            b.start_time,
            s.name AS shop_name,
            s.address AS shop_address
        FROM bookings b
        JOIN shops s ON s.id = b.shop_id
        WHERE b.status = 'confirmed'
          AND b.reminder_30m_sent = false
          AND b.start_time > NOW()
          AND b.start_time <= NOW() + INTERVAL '35 minutes'
          AND b.start_time >= NOW() + INTERVAL '25 minutes'
    LOOP
        -- Mark reminder sent
        UPDATE bookings
        SET reminder_30m_sent = true,
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        -- Insert notification for customer
        INSERT INTO notifications (
            user_id,
            booking_id,
            type,
            title,
            body,
            data
        ) VALUES (
            v_booking.customer_id,
            v_booking.booking_id,
            'reminder_30m',
            'Haircut in 30 Minutes! ⏰',
            'Your appointment for ' || v_booking.service_name || ' at ' || v_booking.shop_name || ' starts at ' || to_char(v_booking.start_time, 'HH12:MI AM') || '. Please arrive 5 mins early!',
            jsonb_build_object(
                'shop_id', v_booking.shop_id,
                'booking_id', v_booking.booking_id,
                'service_name', v_booking.service_name,
                'start_time', v_booking.start_time
            )
        );

        v_30m_count := v_30m_count + 1;
    END LOOP;

    -- 2. Process 24-hour reminders (start_time between 23 and 25 hours from now)
    FOR v_booking IN
        SELECT 
            b.id AS booking_id,
            b.customer_id,
            b.shop_id,
            b.service_name,
            b.start_time,
            s.name AS shop_name
        FROM bookings b
        JOIN shops s ON s.id = b.shop_id
        WHERE b.status = 'confirmed'
          AND b.reminder_24h_sent = false
          AND b.start_time > NOW()
          AND b.start_time <= NOW() + INTERVAL '25 hours'
          AND b.start_time >= NOW() + INTERVAL '23 hours'
    LOOP
        -- Mark reminder sent
        UPDATE bookings
        SET reminder_24h_sent = true,
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        -- Insert notification for customer
        INSERT INTO notifications (
            user_id,
            booking_id,
            type,
            title,
            body,
            data
        ) VALUES (
            v_booking.customer_id,
            v_booking.booking_id,
            'reminder_24h',
            'Upcoming Appointment Tomorrow 📅',
            'Reminder: You have an appointment tomorrow at ' || to_char(v_booking.start_time, 'HH12:MI AM') || ' for ' || v_booking.service_name || ' at ' || v_booking.shop_name || '.',
            jsonb_build_object(
                'shop_id', v_booking.shop_id,
                'booking_id', v_booking.booking_id,
                'service_name', v_booking.service_name,
                'start_time', v_booking.start_time
            )
        );

        v_24h_count := v_24h_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'reminders_30m_processed', v_30m_count,
        'reminders_24h_processed', v_24h_count,
        'processed_at', NOW()
    );
END;
$$;

-- 2. RPC: mark_notification_read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id         UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: user_id mismatch';
    END IF;

    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id AND user_id = p_user_id;

    RETURN true;
END;
$$;

-- 3. RPC: mark_all_notifications_read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: authentication required';
    END IF;

    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: user_id mismatch';
    END IF;

    UPDATE notifications
    SET is_read = true
    WHERE user_id = p_user_id AND is_read = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

-- 4. Enable Realtime on notifications table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION process_booking_reminders() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
