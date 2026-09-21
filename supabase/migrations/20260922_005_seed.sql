-- ================================================================
-- BarberQ — Migration 005: Seed Data
-- Dev/staging seed: 1 shop, 2 staff, 3 services, full hours
-- Pilot location: Indiranagar, Bengaluru
-- Run AFTER all migrations. Safe to re-run (uses ON CONFLICT DO NOTHING).
-- ================================================================

-- ================================================================
-- Test users
-- ================================================================
INSERT INTO users (id, phone, full_name, role)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '+919876543210',
        'Ravi Kumar',
        'shopkeeper'
    ),
    (
        '11111111-1111-1111-1111-222222222222',
        '+919876543211',
        'Priya Sharma',
        'customer'
    )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Test shop — Urban Cuts, Indiranagar, Bengaluru
-- ================================================================
INSERT INTO shops (
    id, owner_id, name, description,
    address, area, city, state, pincode,
    latitude, longitude,
    slot_step_mins, min_advance_booking_mins,
    max_advance_booking_days, cancellation_notice_mins
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Urban Cuts',
    'Classic barbershop in the heart of Indiranagar. Walk-ins welcome, bookings preferred.',
    '47, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru',
    'Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560008',
    12.97840000,
    77.64080000,
    30,   -- 30-min slot steps
    30,   -- min 30 min advance booking
    7,    -- book up to 7 days ahead
    60    -- soft cancellation notice: 60 min
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Business hours: Mon–Sat 9am–9pm, Sunday closed
-- ================================================================
INSERT INTO business_hours (shop_id, day_of_week, open_time, close_time, is_open)
VALUES
    ('22222222-2222-2222-2222-222222222222', 0, '09:00', '18:00', false),  -- Sunday closed
    ('22222222-2222-2222-2222-222222222222', 1, '09:00', '21:00', true),   -- Monday
    ('22222222-2222-2222-2222-222222222222', 2, '09:00', '21:00', true),   -- Tuesday
    ('22222222-2222-2222-2222-222222222222', 3, '09:00', '21:00', true),   -- Wednesday
    ('22222222-2222-2222-2222-222222222222', 4, '09:00', '21:00', true),   -- Thursday
    ('22222222-2222-2222-2222-222222222222', 5, '09:00', '21:00', true),   -- Friday
    ('22222222-2222-2222-2222-222222222222', 6, '09:00', '20:00', true)    -- Saturday (closes earlier)
ON CONFLICT (shop_id, day_of_week) DO NOTHING;

-- ================================================================
-- Lunch break — every day (day_of_week NULL = all days)
-- ================================================================
INSERT INTO business_breaks (shop_id, day_of_week, start_time, end_time, label)
VALUES ('22222222-2222-2222-2222-222222222222', NULL, '13:00', '14:00', 'Lunch Break')
ON CONFLICT DO NOTHING;

-- ================================================================
-- Services
-- ================================================================
INSERT INTO services (id, shop_id, name, category, price, duration_mins, sort_order)
VALUES
    (
        '33333333-3333-3333-3333-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'Haircut',
        'haircut',
        150.00,
        30,
        1
    ),
    (
        '33333333-3333-3333-3333-000000000002',
        '22222222-2222-2222-2222-222222222222',
        'Beard Trim',
        'beard',
        80.00,
        15,
        2
    ),
    (
        '33333333-3333-3333-3333-000000000003',
        '22222222-2222-2222-2222-222222222222',
        'Haircut + Beard',
        'haircut',
        200.00,
        45,
        3
    )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Staff
-- ================================================================
INSERT INTO staff (id, shop_id, name, sort_order)
VALUES
    (
        '44444444-4444-4444-4444-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'Rahul',
        1
    ),
    (
        '44444444-4444-4444-4444-000000000002',
        '22222222-2222-2222-2222-222222222222',
        'Avinash',
        2
    )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Staff services — both staff can do all services
-- ================================================================
INSERT INTO staff_services (staff_id, service_id)
VALUES
    ('44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000001'),
    ('44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000002'),
    ('44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000003'),
    ('44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000001'),
    ('44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000002'),
    ('44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000003')
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- ================================================================
-- Rahul works 9am-5pm (overrides shop close of 9pm)
-- Avinash follows shop hours (no staff_hours row needed)
-- ================================================================
INSERT INTO staff_hours (staff_id, day_of_week, start_time, end_time, is_working)
VALUES
    ('44444444-4444-4444-4444-000000000001', 1, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 2, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 3, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 4, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 5, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 6, '09:00', '17:00', true),
    ('44444444-4444-4444-4444-000000000001', 0, '09:00', '17:00', false)  -- Rahul off on Sunday
ON CONFLICT (staff_id, day_of_week) DO NOTHING;

-- ================================================================
-- Verification queries to run after seed:
-- SELECT * FROM shops;
-- SELECT * FROM services WHERE shop_id = '22222222-2222-2222-2222-222222222222';
-- SELECT * FROM staff WHERE shop_id = '22222222-2222-2222-2222-222222222222';
-- SELECT * FROM business_hours WHERE shop_id = '22222222-2222-2222-2222-222222222222';
-- Test availability engine (replace date with a future weekday):
-- SELECT * FROM get_available_slots(
--     '22222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-000000000001',
--     CURRENT_DATE + 1,
--     NULL
-- );
-- ================================================================
