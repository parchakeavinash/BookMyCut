// ============================================================
// BarberQ — Booking draft store (Zustand)
// Holds state across the multi-step booking flow:
//   Service Selection → Date/Time → Review → Confirm
// Cleared after booking is created.
// ============================================================

import { create } from 'zustand';
import { Shop, Service, Staff, BookingDraft } from '@/types';

interface BookingDraftState extends BookingDraft {
  // Actions
  setShop:         (shop: Shop) => void;
  setService:      (service: Service) => void;
  setStaff:        (staff: Staff | null) => void;
  setDate:         (date: string) => void;
  setSlot:         (slot: string) => void;
  reset:           () => void;
}

const initialDraft: BookingDraft = {
  shop:         null,
  service:      null,
  staff:        null,
  selectedDate: '',
  selectedSlot: null,
};

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initialDraft,

  setShop:    (shop)    => set({ shop }),
  setService: (service) => set({ service }),
  setStaff:   (staff)   => set({ staff }),
  setDate:    (date)    => set({ selectedDate: date, selectedSlot: null }),
  setSlot:    (slot)    => set({ selectedSlot: slot }),
  reset:      ()        => set(initialDraft),
}));
