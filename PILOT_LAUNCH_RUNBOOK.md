# BarberQ — Pilot Launch & Production Readiness Runbook 💈

> **Version:** 1.0 Pilot Release | **Target Pilot:** Urban Cuts (Indiranagar, Bengaluru)  
> **Platform:** React Native (Expo Web · Android · iOS) + Supabase (PostgreSQL 15+ · Realtime · Storage)  
> **Status:** Production Ready ✅

---

## 1. Executive Summary & Pilot Objectives

BarberQ's pilot deployment eliminates walk-in waiting room congestion by pairing local customers with verified salon barbers in real time.

### Core Pilot Success Metrics
1. **Zero Double-Bookings:** Transactional PostgreSQL advisory locks guarantee conflict-free bookings across simultaneous requests.
2. **Real-time Synchronization:** Bookings appear on the salon dashboard within 2 seconds via Supabase WebSockets.
3. **No-Show Reduction:** Automatic 24-hour and 30-minute reminders prompt customers ahead of appointments.
4. **Fast Checkout:** Customer completes booking in under 3 taps with Pay-at-Salon cash/UPI.

---

## 2. Pre-Flight Infrastructure Checklist

| Checkpoint | Requirement | Status / Action |
|---|---|---|
| **Database Tables** | All 11 tables deployed with RLS enabled | ✅ Verified (`verify_production_readiness.cjs`) |
| **Atomic Booking RPC** | `create_booking` with advisory lock isolation | ✅ Verified with concurrent stress test |
| **Dynamic Availability** | `get_available_slots` calculating breaks & working hours | ✅ Verified (22 slots returned for pilot day) |
| **Realtime Publication** | `bookings` and `notifications` in `supabase_realtime` | ✅ Active |
| **Supabase Storage** | `shop-images` bucket with public read & authenticated write | ✅ Active & policies enforced |
| **Mobile App Assets** | App icons, adaptive icons, and web favicon configured | ✅ In place in `assets/images` |
| **Error Handling** | Root-level `ErrorBoundary` prevents blank screens | ✅ Exported in `apps/mobile/app/_layout.tsx` |

---

## 3. Production Environment Configuration

In `apps/mobile/.env.local` (or your cloud hosting environment variables):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-publishable-key>

# SMS / OTP Provider (Twilio or MSG91)
Twilio_account_sid=<your-account-sid>
Twilio_auth_token=<your-auth-token>
Twilio_phone_number=<your-twilio-phone>
Twilio_verify_service_sid=<your-verify-service-sid>
```

> [!CAUTION]
> Never commit `.env` or `.env.local` to Git. The `.gitignore` is pre-configured to exclude all environment files.

---

## 4. Automated Reminders Scheduling Setup

BarberQ includes a database function `process_booking_reminders()` that automatically:
- Sends **24-hour reminders** to customers whose appointments start in 23–25 hours.
- Sends **30-minute reminders** to customers whose appointments start in 25–35 minutes.

### Option A: Supabase `pg_cron` (Recommended if enabled)
Run this in the Supabase SQL Editor:
```sql
-- Schedule reminder processing every 5 minutes
SELECT cron.schedule(
    'process-booking-reminders-job',
    '*/5 * * * *',
    $$ SELECT public.process_booking_reminders(); $$
);
```

### Option B: External Webhook / GitHub Actions / Cron-Job.org
Call the RPC endpoint every 5 minutes:
```bash
curl -X POST 'https://<your-project-ref>.supabase.co/rest/v1/rpc/process_booking_reminders' \
  -H 'apikey: <your-service-role-or-anon-key>' \
  -H 'Authorization: Bearer <your-service-role-or-anon-key>'
```

---

## 5. Web & Mobile Deployment

### A. Web Application (Vercel / Netlify / Cloudflare Pages)
BarberQ compiles to a standalone Single-Page Application (SPA):

```bash
cd apps/mobile
npm run build:web
```
- **Build Output:** `apps/mobile/dist`
- **Routing Configuration (Vercel `vercel.json`):**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### B. Mobile Applications (Expo EAS Build)
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure project: `eas build:configure`
4. Build Android APK (for salon tablet & beta testers):
   ```bash
   eas build --platform android --profile preview
   ```
5. Build iOS TestFlight:
   ```bash
   eas build --platform ios --profile preview
   ```

---

## 6. Pilot Salon Onboarding & Physical Setup

### Pilot Salon Details
- **Shop Name:** Urban Cuts
- **Location:** 100 Feet Road, Indiranagar, Bengaluru
- **Opening Hours:** 09:00 AM – 09:00 PM (Monday – Sunday)
- **Lunch Break:** 01:00 PM – 02:00 PM
- **Initial Staff:** Rahul (Senior Stylist), Amit (Barber)

### Physical In-Salon QR Code Signage
To convert walk-in customers into scheduled app users:
1. Generate a QR code linking to:  
   `https://<your-app-domain>/shop/<pilot-shop-id>`
2. Print and place counter displays:
   > **"Skip the line! Scan to book your slot or select your favorite barber."**
3. Walk-in customers scan the QR code on their phone, pick a slot, and are immediately queued into the salon tablet.

---

## 7. Day-1 Salon Operations Playbook

### Morning Routine (Shopkeeper)
1. Open the tablet / browser at `/(shopkeeper)/dashboard`.
2. Inspect today's queue: review total bookings, scheduled times, and assigned barbers.
3. If a barber is on unplanned leave, open `/(shopkeeper)/hours` or staff settings to adjust availability.

### During Appointments
1. **Customer Arrives:** Check customer name and time against the Live Queue.
2. **Seat Customer:** Tap the appointment row to view details or customer notes.
3. **Finish Service:** Click **"Complete"** (updates metrics and sends thank-you notification).
4. **No-Show:** If customer does not arrive after 15 minutes, click **"No-Show"** to free the chair and record the attendance record.

---

## 8. Verification & Smoke Testing Commands

Run the automated verification suite anytime before or after updates:

```bash
# 1. Full Production Readiness Health Check (28/28 checks)
npm run check:production

# 2. Master End-to-End Test Suite (19/19 E2E tests)
npm run test:e2e

# 3. TypeScript Compilation Check (0 errors)
npm run check:types

# 4. Production Web Bundle Verification
npm run build:web
```

---

## 9. Incident Management & Support

- **Database / API Outage:** Check Supabase status at `status.supabase.com`.
- **Customer Cancellation Dispute:** The platform uses a soft-warning policy in MVP. Cancellations free the slot immediately.
- **Client Crash Safeguard:** The root layout includes an `ErrorBoundary` that displays a clean recovery card with a **"Try Again"** button, preventing full application termination.
