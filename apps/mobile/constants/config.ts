// ============================================================
// BarberQ — App-wide configuration constants
// ============================================================

export const Config = {
  supabaseUrl:  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnon: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,

  // Booking rules (mirrors DB defaults, used for UI validation)
  minAdvanceBookingMins:  30,
  maxAdvanceBookingDays:  7,
  cancellationNoticeMins: 60,

  // Map defaults — Indiranagar, Bengaluru (pilot area)
  defaultLatitude:  12.9784,
  defaultLongitude: 77.6408,
  defaultCity:      'Bengaluru',
  defaultArea:      'Indiranagar',

  // Discovery radius in km
  discoveryRadiusKm: 5,

  // Max images per shop
  maxShopImages: 5,
} as const;
