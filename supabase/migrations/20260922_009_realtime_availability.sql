-- ================================================================
-- BarberQ — Migration 009: Enable Realtime for Bookings & Availability Feed
-- Enables Supabase Realtime change broadcast on the bookings table.
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    END IF;
END $$;
