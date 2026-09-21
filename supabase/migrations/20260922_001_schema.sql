-- ================================================================
-- BarberQ — Migration 001: Core Schema
-- Run this first. Creates all tables.
-- ================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- ================================================================
-- TABLE: users
-- All platform users: customers, shopkeepers, admins
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(15) UNIQUE,
    email           VARCHAR(255) UNIQUE,
    full_name       VARCHAR(100) NOT NULL DEFAULT '',
    avatar_url      TEXT,
    role            TEXT        NOT NULL DEFAULT 'customer'
                                CHECK (role IN ('customer', 'shopkeeper', 'admin')),
    fcm_token       TEXT,
    no_show_count   INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone  ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role) WHERE is_active = true;

-- ================================================================
-- TABLE: shops
-- ================================================================
CREATE TABLE IF NOT EXISTS shops (
    id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                  UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name                      VARCHAR(150)  NOT NULL,
    description               TEXT,
    address                   TEXT          NOT NULL,
    area                      VARCHAR(100),
    city                      VARCHAR(100)  NOT NULL,
    state                     VARCHAR(100),
    pincode                   VARCHAR(10),
    latitude                  DECIMAL(10,8) NOT NULL,
    longitude                 DECIMAL(11,8) NOT NULL,
    phone                     VARCHAR(15),
    timezone                  TEXT          NOT NULL DEFAULT 'Asia/Kolkata',
    slot_step_mins            INT           NOT NULL DEFAULT 30
                                            CHECK (slot_step_mins IN (15, 30, 45, 60)),
    min_advance_booking_mins  INT           NOT NULL DEFAULT 30,
    max_advance_booking_days  INT           NOT NULL DEFAULT 7,
    cancellation_notice_mins  INT           NOT NULL DEFAULT 60,
    is_verified               BOOLEAN       NOT NULL DEFAULT false,
    is_active                 BOOLEAN       NOT NULL DEFAULT true,
    rating_avg                DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    review_count              INT           NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner  ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active, city);
CREATE INDEX IF NOT EXISTS idx_shops_geo    ON shops(latitude, longitude);

-- ================================================================
-- TABLE: shop_images
-- ================================================================
CREATE TABLE IF NOT EXISTS shop_images (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    storage_path  TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    is_cover      BOOLEAN     NOT NULL DEFAULT false,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_images_shop ON shop_images(shop_id);

-- ================================================================
-- TABLE: services
-- ================================================================
CREATE TABLE IF NOT EXISTS services (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       UUID          NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name          VARCHAR(150)  NOT NULL,
    description   TEXT,
    category      VARCHAR(100),
    price         DECIMAL(8,2)  NOT NULL CHECK (price >= 0),
    duration_mins INT           NOT NULL CHECK (duration_mins > 0),
    is_active     BOOLEAN       NOT NULL DEFAULT true,
    sort_order    INT           NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_shop ON services(shop_id, is_active);

-- ================================================================
-- TABLE: staff
-- Barbers. user_id nullable — staff logins added in future phase.
-- ================================================================
CREATE TABLE IF NOT EXISTS staff (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id     UUID        REFERENCES users(id),
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(15),
    avatar_url  TEXT,
    bio         TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_shop ON staff(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id) WHERE user_id IS NOT NULL;

-- ================================================================
-- TABLE: staff_services
-- ================================================================
CREATE TABLE IF NOT EXISTS staff_services (
    staff_id    UUID NOT NULL REFERENCES staff(id)    ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- ================================================================
-- TABLE: business_hours
-- 0=Sunday, 1=Monday … 6=Saturday
-- ================================================================
CREATE TABLE IF NOT EXISTS business_hours (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    day_of_week SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time   TIME        NOT NULL,
    close_time  TIME        NOT NULL,
    is_open     BOOLEAN     NOT NULL DEFAULT true,
    UNIQUE (shop_id, day_of_week)
);

-- ================================================================
-- TABLE: business_breaks
-- day_of_week NULL = applies to every open day
-- ================================================================
CREATE TABLE IF NOT EXISTS business_breaks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    day_of_week SMALLINT    CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    label       VARCHAR(100) NOT NULL DEFAULT 'Break'
);

CREATE INDEX IF NOT EXISTS idx_breaks_shop ON business_breaks(shop_id);

-- ================================================================
-- TABLE: shop_closed_dates
-- ================================================================
CREATE TABLE IF NOT EXISTS shop_closed_dates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    closed_date DATE        NOT NULL,
    reason      TEXT,
    UNIQUE (shop_id, closed_date)
);

-- ================================================================
-- TABLE: staff_hours
-- Per-staff schedule overrides. No row = inherits shop hours.
-- ================================================================
CREATE TABLE IF NOT EXISTS staff_hours (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    is_working  BOOLEAN     NOT NULL DEFAULT true,
    UNIQUE (staff_id, day_of_week)
);

-- ================================================================
-- TABLE: staff_days_off
-- ================================================================
CREATE TABLE IF NOT EXISTS staff_days_off (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    off_date    DATE        NOT NULL,
    reason      TEXT,
    UNIQUE (staff_id, off_date)
);

-- ================================================================
-- TABLE: bookings
-- Auto-confirmed on creation. Status starts as 'confirmed'.
-- ================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id           UUID        NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
    shop_id               UUID        NOT NULL REFERENCES shops(id)     ON DELETE RESTRICT,
    staff_id              UUID        REFERENCES staff(id),
    service_id            UUID        NOT NULL REFERENCES services(id),
    -- Snapshot for history integrity
    service_name          VARCHAR(150) NOT NULL,
    service_price         DECIMAL(8,2) NOT NULL,
    service_duration_mins INT         NOT NULL,
    staff_name            VARCHAR(100),
    -- Time (UTC)
    start_time            TIMESTAMPTZ NOT NULL,
    end_time              TIMESTAMPTZ NOT NULL,
    -- Status
    status                TEXT        NOT NULL DEFAULT 'confirmed'
                                      CHECK (status IN (
                                          'confirmed',
                                          'cancelled',
                                          'completed',
                                          'no_show'
                                      )),
    customer_note         TEXT,
    cancellation_reason   TEXT,
    cancelled_by          TEXT        CHECK (cancelled_by IN ('customer', 'shopkeeper', 'system')),
    rescheduled_from_id   UUID        REFERENCES bookings(id),
    -- Reminder tracking for pg_cron
    reminder_24h_sent     BOOLEAN     NOT NULL DEFAULT false,
    reminder_30m_sent     BOOLEAN     NOT NULL DEFAULT false,
    -- Timestamps
    completed_at          TIMESTAMPTZ,
    cancelled_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_shop_time   ON bookings(shop_id, start_time)
    WHERE status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_bookings_staff_time  ON bookings(staff_id, start_time)
    WHERE status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_bookings_customer    ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_shop ON bookings(shop_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_reminders   ON bookings(start_time, reminder_24h_sent, reminder_30m_sent)
    WHERE status = 'confirmed';

-- ================================================================
-- TABLE: notifications
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id  UUID        REFERENCES bookings(id),
    type        TEXT        NOT NULL,
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL,
    data        JSONB       NOT NULL DEFAULT '{}',
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, sent_at DESC);

-- ================================================================
-- Auto-update updated_at on every UPDATE
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_shops_updated_at') THEN
        CREATE TRIGGER trg_shops_updated_at
            BEFORE UPDATE ON shops
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_services_updated_at') THEN
        CREATE TRIGGER trg_services_updated_at
            BEFORE UPDATE ON services
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_updated_at') THEN
        CREATE TRIGGER trg_staff_updated_at
            BEFORE UPDATE ON staff
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at') THEN
        CREATE TRIGGER trg_bookings_updated_at
            BEFORE UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
