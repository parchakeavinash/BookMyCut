// ============================================================
// BarberQ — Shared TypeScript types
// Mirrors the database schema exactly.
// ============================================================

export type UserRole = 'customer' | 'shopkeeper' | 'admin';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  fcm_token: string | null;
  no_show_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  area: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  timezone: string;
  slot_step_mins: number;
  min_advance_booking_mins: number;
  max_advance_booking_days: number;
  cancellation_notice_mins: number;
  is_verified: boolean;
  is_active: boolean;
  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations
  shop_images?: ShopImage[];
  services?: Service[];
  staff?: Staff[];
  business_hours?: BusinessHour[];
}

export interface ShopImage {
  id: string;
  shop_id: string;
  storage_path: string;
  url: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  duration_mins: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  shop_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  staff_services?: { service_id: string }[];
}

export interface BusinessHour {
  id: string;
  shop_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  open_time: string;   // "HH:MM"
  close_time: string;
  is_open: boolean;
}

export interface BusinessBreak {
  id: string;
  shop_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  label: string;
}

export interface StaffHour {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export interface ShopClosedDate {
  id: string;
  shop_id: string;
  closed_date: string;
  reason: string | null;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Booking {
  id: string;
  customer_id: string;
  shop_id: string;
  staff_id: string | null;
  service_id: string;
  // Snapshots
  service_name: string;
  service_price: number;
  service_duration_mins: number;
  staff_name: string | null;
  // Time
  start_time: string; // ISO UTC
  end_time: string;
  // State
  status: BookingStatus;
  customer_note: string | null;
  cancellation_reason: string | null;
  cancelled_by: 'customer' | 'shopkeeper' | 'system' | null;
  rescheduled_from_id: string | null;
  reminder_24h_sent: boolean;
  reminder_30m_sent: boolean;
  // Timestamps
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  shops?: Pick<Shop, 'id' | 'name' | 'address' | 'area' | 'city' | 'phone'>;
  staff?: Pick<Staff, 'id' | 'name' | 'avatar_url'>;
}

export interface Notification {
  id: string;
  user_id: string;
  booking_id: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  sent_at: string;
}

// Availability slot returned by get_available_slots() RPC
export interface AvailableSlot {
  slot_time: string;        // ISO UTC
  available_staff_count: number;
}

// Booking draft — held in Zustand during the booking flow
export interface BookingDraft {
  shop: Shop | null;
  service: Service | null;
  staff: Staff | null;      // null = any available
  selectedDate: string;     // 'YYYY-MM-DD'
  selectedSlot: string | null; // ISO UTC
}
