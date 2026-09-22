# BarberQ 💈

> **Smart Appointment Booking & Queue Management for Modern Barbershops & Salons**

BarberQ eliminates the frustration of long walk-in wait times (30–90+ mins) by giving customers real-time visibility into barber availability and allowing them to book slots in advance. Shopkeepers get a unified web and tablet dashboard to manage their daily schedule, services, staff, and capacity with zero double-booking conflicts.

---

## 🌟 Key Features

### 👤 Customer Experience (iOS · Android · Web)
- **Nearby Shop Discovery:** Discover local barbershops with real-time open/closed status and location details.
- **Dynamic Slot Availability:** On-the-fly slot generation based on active business hours, breaks, and staff schedules—no stale pre-generated rows.
- **Barber Selection & Auto-Assignment:** Select a specific preferred barber or choose "Any Available Barber" for intelligent load-balanced assignment.
- **Instant Booking Confirmation:** Conflict-free slot booking protected by transactional database advisory locks.
- **Appointment Lifecycle:** View upcoming visits, reschedule, or cancel with soft-warning policy alerts.

### ✂️ Shopkeeper Dashboard (Web · Tablet · Mobile)
- **Interactive Daily Schedule:** Real-time visibility into upcoming appointments and barber schedules.
- **Service & Pricing Catalogue:** Configure services, prices, durations, and sort orders.
- **Staff & Chair Management:** Add barbers, assign service qualifications, and define individual working hours and days off.
- **Business Hours & Break Times:** Define weekly opening times, lunch breaks, and holiday closures.

---

## 🏗️ Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                     SINGLE EXPO APP                         │
│  ├── /customer/*    (iOS + Android + Web)                   │
│  └── /shopkeeper/*  (Optimized for Web/Tablet & Mobile)     │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS (REST / RPC) + WebSockets (Realtime)
┌───────────────▼─────────────────────────────────────────────┐
│                    SUPABASE PLATFORM                        │
│  ├── Supabase Auth       (Phone OTP / JWT session)          │
│  ├── PostgreSQL          (pg_advisory_xact_lock, RLS)       │
│  │   ├── Availability Engine (get_available_slots)          │
│  │   └── Atomic Booking Engine (create_booking)             │
│  └── Supabase Realtime   (Instant appointment updates)      │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend:** [Expo](https://expo.dev) (React Native 0.86, React 19, Expo Router 57)
- **Styling & Icons:** Vanilla React Native StyleSheet with custom design tokens
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Auth store, Booking draft store)
- **Backend & Database:** [Supabase](https://supabase.com) (PostgreSQL 15+, pg_advisory_xact_lock, Row-Level Security)

---

## 🔒 Atomic Double-Booking Protection

To prevent concurrent race conditions when two customers attempt to book the same barber at the exact same minute, BarberQ uses transaction-scoped PostgreSQL advisory locks (`pg_advisory_xact_lock`):

1. Hashes the barber UUID and slot timestamp into a unique advisory lock key.
2. Acquires the transaction lock before checking availability.
3. Validates slot freedom *inside* the lock to prevent Time-Of-Check to Time-Of-Use (TOCTOU) races.
4. Atomically records the confirmed booking or immediately rejects conflicts with `SLOT_UNAVAILABLE`.

---

## 📁 Repository Structure

```text
BarberQ/
├── apps/
│   └── mobile/                # Single cross-platform Expo application
│       ├── app/               # Expo Router file-based navigation
│       │   ├── (auth)/        # Phone OTP, Welcome, and Profile Setup
│       │   ├── (customer)/    # Discover, Booking Flow, My Appointments
│       │   ├── (shopkeeper)/  # Dashboard, Calendar, Services, Staff, Hours
│       │   └── (admin)/       # Platform moderation & administration
│       ├── constants/         # Theme tokens, colors, typography, config
│       ├── hooks/             # Custom React hooks (useAuth, etc.)
│       ├── lib/               # Supabase singleton & storage adapters
│       ├── stores/            # Zustand global state stores
│       └── types/             # TypeScript definitions & DB entities
│
├── supabase/
│   └── migrations/            # Versioned SQL migrations
│       ├── 20260922_001_schema.sql                      # Core DB tables
│       ├── 20260922_002_functions.sql                   # Availability & booking logic
│       ├── 20260922_003_rls.sql                         # Row Level Security policies
│       ├── 20260922_004_cron.sql                        # Background reminder jobs
│       ├── 20260922_005_seed.sql                        # Pilot shop & staff seed data
│       ├── 20260922_006_security_definer_functions.sql # Security definer updates
│       ├── 20260922_007_auth_enforcement.sql            # Auth enforcement
│       ├── 20260922_008_shop_images_storage.sql        # Supabase Storage bucket & RLS
│       ├── 20260922_009_realtime_bookings.sql          # Realtime bookings publication
│       ├── 20260922_010_shopkeeper_actions.sql         # Shopkeeper booking actions & metrics
│       └── 20260922_011_notifications_and_reminders.sql # Push notifications & reminder engine
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or v20+ recommended)
- [npm](https://www.npmjs.com) or [yarn](https://yarnpkg.com)
- [Supabase](https://supabase.com) project or local Supabase CLI

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/BarberQ.git
cd BarberQ
```

### 2. Configure Environment Variables
Inside `apps/mobile/`, create a `.env.local` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup
Apply migrations in sequence in your Supabase SQL Editor:
1. `supabase/migrations/20260922_001_schema.sql`
2. `supabase/migrations/20260922_002_functions.sql`
3. `supabase/migrations/20260922_003_rls.sql`
4. `supabase/migrations/20260922_005_seed.sql`
5. `supabase/migrations/20260922_006_security_definer_functions.sql`
6. `supabase/migrations/20260922_010_shopkeeper_actions.sql`
7. `supabase/migrations/20260922_011_notifications_and_reminders.sql`

### 4. Install Dependencies & Run
```bash
cd apps/mobile
npm install

# Start the Expo development server (Web, iOS, Android)
npm run web

# Or launch on mobile simulator / physical device
npm run ios
npm run android
```

---

## 🧪 Testing

### Automated Concurrency Test
Run the atomic double-booking verification script:
```bash
cd apps/mobile
node test_concurrency.cjs
```
This fires simultaneous booking attempts for the same barber and slot, verifying that exactly **1 succeeds** and the conflicting request is safely rejected with `SLOT_UNAVAILABLE`.

### Master End-to-End Integration Test Suite
Run the 19-test end-to-end integration test suite:
```bash
node apps/mobile/test_phase9_e2e.cjs
```
This tests:
- Customer discovery & city filtering
- Dynamic availability engine & slot generation
- Advisory lock concurrency & double-booking guard
- Shopkeeper live queue, daily metrics, & booking lifecycle RPCs (Confirm, Complete, No-Show, Cancel)
- Edge cases: shop closed dates, business hours integrity, breaks
- Notifications table access, reminders engine execution, & read status guards

### Type Checking & Web Export
```bash
cd apps/mobile
npx tsc --noEmit
npx expo export --platform web
```

---

## 🗺️ Roadmap
- [x] **Phase 1:** Core Schema, Dynamic Availability Engine, Advisory Locks & Expo Setup
- [x] **Phase 2:** Authentication (Phone OTP, Auth Guard, Role-Based Routing)
- [x] **Phase 3:** Shopkeeper Setup & Profile Management
- [x] **Phase 4:** Nearby Shop Discovery & Search
- [x] **Phase 5:** Slot Selection & Real-Time Availability Feed
- [x] **Phase 6:** Booking Checkout & Appointment Confirmation
- [x] **Phase 7:** Shopkeeper Schedule Dashboard & Booking Actions
- [x] **Phase 8:** Push Reminders & Notifications (FCM / APNs)
- [x] **Phase 9:** Polish, Edge Cases & Master End-to-End Testing
- [x] **Phase 10:** Pilot Launch & Production Readiness ([Runbook](PILOT_LAUNCH_RUNBOOK.md))

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](apps/mobile/LICENSE) file for details.
