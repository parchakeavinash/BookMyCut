-- ================================================================
-- BarberQ — Migration 004: pg_cron Scheduled Jobs
-- Handles automated 30-minute and 24-hour appointment reminders.
-- Run AFTER 001, 002, 003.
-- NOTE: pg_cron must be enabled in Supabase dashboard first:
--   Database → Extensions → pg_cron → Enable
-- ================================================================

-- ================================================================
-- CRON JOB: 30-minute reminders
-- Runs every 5 minutes.
-- Marks bookings as reminder_30m_sent = true.
-- The actual push notification is dispatched by a Database Webhook
-- configured in Supabase Dashboard pointing to the send-push
-- Edge Function. Trigger event: UPDATE on bookings where
-- reminder_30m_sent changes to true.
-- ================================================================
SELECT cron.schedule(
    'barberq-reminder-30m',    -- job name (must be unique)
    '*/5 * * * *',             -- every 5 minutes
    $$
        UPDATE bookings
        SET reminder_30m_sent = true
        WHERE status = 'confirmed'
          AND reminder_30m_sent = false
          AND start_time > NOW()
          AND start_time <= NOW() + INTERVAL '35 minutes'
          AND start_time >= NOW() + INTERVAL '25 minutes';
    $$
);

-- ================================================================
-- CRON JOB: 24-hour reminders
-- Runs every 30 minutes.
-- ================================================================
SELECT cron.schedule(
    'barberq-reminder-24h',
    '*/30 * * * *',            -- every 30 minutes
    $$
        UPDATE bookings
        SET reminder_24h_sent = true
        WHERE status = 'confirmed'
          AND reminder_24h_sent = false
          AND start_time > NOW()
          AND start_time <= NOW() + INTERVAL '25 hours'
          AND start_time >= NOW() + INTERVAL '23 hours';
    $$
);

-- ================================================================
-- CRON JOB: Mark past unvisited confirmed bookings as no_show
-- Runs every hour. Marks confirmed bookings whose end_time has
-- passed by more than 30 minutes as no_show.
-- Shopkeeper can override this manually.
-- ================================================================
SELECT cron.schedule(
    'barberq-auto-noshow',
    '0 * * * *',               -- every hour
    $$
        UPDATE bookings
        SET status = 'no_show',
            cancelled_by = 'system'
        WHERE status = 'confirmed'
          AND end_time < NOW() - INTERVAL '30 minutes';
    $$
);
