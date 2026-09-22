// ============================================================
// BarberQ — useCustomerBookings Hook
// Fetches, filters, and manages customer bookings (Upcoming & History)
// + cancel_booking RPC & real-time updates.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';

export function useCustomerBookings() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          *,
          shops(id, name, address, area, city, phone),
          staff(id, name, avatar_url)
        `)
        .eq('customer_id', user.id)
        .order('start_time', { ascending: false });

      if (fetchErr) throw fetchErr;

      setBookings((data || []) as Booking[]);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Realtime subscription for customer's bookings
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`customer-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings]);

  // Cancel booking via RPC
  const cancelCustomerBooking = async (bookingId: string, reason = 'Cancelled by customer') => {
    if (!user) throw new Error('Not authenticated');

    const { data, error: rpcErr } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_actor_id: user.id,
      p_actor_role: 'customer',
      p_reason: reason,
    });

    if (rpcErr) throw rpcErr;

    // Optimistically update local state
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled',
              cancelled_by: 'customer',
              cancellation_reason: reason,
              cancelled_at: new Date().toISOString(),
            }
          : b
      )
    );

    return data as Booking;
  };

  const now = new Date().toISOString();

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && b.end_time >= now
  );

  const pastBookings = bookings.filter(
    (b) => b.status !== 'confirmed' || b.end_time < now
  );

  return {
    bookings,
    upcomingBookings,
    pastBookings,
    isLoading,
    error,
    refreshBookings: fetchBookings,
    cancelBooking: cancelCustomerBooking,
  };
}
