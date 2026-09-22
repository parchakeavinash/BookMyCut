// ============================================================
// BarberQ — useShopkeeperBookings Hook
// Provides schedule management, live queue metrics, and booking
// lifecycle actions (Complete, Cancel, No-Show) with Realtime sync.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';

export interface ShopkeeperDayStats {
  totalToday: number;
  completedToday: number;
  revenueToday: number;
  pendingToday: number;
}

interface UseShopkeeperBookingsOptions {
  shopId?: string;
  selectedDate?: string; // 'YYYY-MM-DD'
  staffId?: string | null;
  statusFilter?: 'all' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

export function useShopkeeperBookings(options: UseShopkeeperBookingsOptions = {}) {
  const { user } = useAuthStore();
  const { shopId, selectedDate, staffId, statusFilter = 'all' } = options;

  // Format today as YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const activeDate = selectedDate || todayStr;

  const [dateBookings, setDateBookings] = useState<Booking[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [newBookingAlert, setNewBookingAlert] = useState<Booking | null>(null);

  // Fetch bookings for the selected date and for today (to compute metrics)
  const fetchBookings = useCallback(async () => {
    if (!user || !shopId) {
      setDateBookings([]);
      setTodayBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch bookings for the selected date window [startOfDay, endOfDay]
      const startOfActiveDate = new Date(`${activeDate}T00:00:00`).toISOString();
      const endOfActiveDate = new Date(`${activeDate}T23:59:59.999`).toISOString();

      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customer_id (
            id,
            full_name,
            phone,
            avatar_url,
            no_show_count
          ),
          staff:staff_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('shop_id', shopId)
        .gte('start_time', startOfActiveDate)
        .lte('start_time', endOfActiveDate)
        .order('start_time', { ascending: true });

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: dateData, error: dateErr } = await query;
      if (dateErr) throw dateErr;

      setDateBookings((dateData || []) as Booking[]);

      // 2. Fetch today's all bookings for accurate top-level metrics
      if (activeDate === todayStr) {
        setTodayBookings((dateData || []) as Booking[]);
      } else {
        const startOfToday = new Date(`${todayStr}T00:00:00`).toISOString();
        const endOfToday = new Date(`${todayStr}T23:59:59.999`).toISOString();

        const { data: todayData, error: todayErr } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            service_price,
            start_time
          `)
          .eq('shop_id', shopId)
          .gte('start_time', startOfToday)
          .lte('start_time', endOfToday);

        if (todayErr) throw todayErr;
        setTodayBookings((todayData || []) as Booking[]);
      }
    } catch (err: any) {
      console.error('Error fetching shopkeeper bookings:', err);
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [user, shopId, activeDate, staffId, statusFilter, todayStr]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time subscription on bookings table for this shop
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`shop-bookings-realtime-${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBooking = payload.new as Booking;
            setNewBookingAlert(newBooking);
          }
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, fetchBookings]);

  // Computed metrics for Today
  const stats: ShopkeeperDayStats = useMemo(() => {
    const list = activeDate === todayStr ? dateBookings : todayBookings;
    const totalToday = list.length;
    const completedToday = list.filter((b) => b.status === 'completed').length;
    const pendingToday = list.filter((b) => b.status === 'confirmed').length;
    const revenueToday = list
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.service_price) || 0), 0);

    return { totalToday, completedToday, revenueToday, pendingToday };
  }, [activeDate, todayStr, dateBookings, todayBookings]);

  // 1. Complete Booking
  const completeBooking = async (bookingId: string) => {
    if (!user) throw new Error('Not authenticated');
    setIsActionLoading(true);

    try {
      const { error: rpcErr } = await supabase.rpc('complete_booking', {
        p_booking_id: bookingId,
        p_actor_id: user.id,
      });

      if (rpcErr) throw rpcErr;

      // Optimistically update
      setDateBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: 'completed', completed_at: new Date().toISOString() }
            : b
        )
      );
      setTodayBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: 'completed', completed_at: new Date().toISOString() }
            : b
        )
      );
    } catch (err: any) {
      console.error('Error completing booking:', err);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 2. Mark No-Show
  const markNoShow = async (bookingId: string, reason = 'Customer did not show up') => {
    if (!user) throw new Error('Not authenticated');
    setIsActionLoading(true);

    try {
      const { error: rpcErr } = await supabase.rpc('mark_no_show', {
        p_booking_id: bookingId,
        p_actor_id: user.id,
        p_reason: reason,
      });

      if (rpcErr) throw rpcErr;

      // Optimistically update
      setDateBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: 'no_show', cancellation_reason: reason }
            : b
        )
      );
      setTodayBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: 'no_show', cancellation_reason: reason }
            : b
        )
      );
    } catch (err: any) {
      console.error('Error marking no-show:', err);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Cancel Booking
  const cancelBooking = async (bookingId: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');
    setIsActionLoading(true);

    try {
      const { error: rpcErr } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_actor_id: user.id,
        p_actor_role: 'shopkeeper',
        p_reason: reason,
      });

      if (rpcErr) throw rpcErr;

      // Optimistically update
      setDateBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: 'cancelled',
                cancelled_by: 'shopkeeper',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
              }
            : b
        )
      );
      setTodayBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: 'cancelled',
                cancelled_by: 'shopkeeper',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
              }
            : b
        )
      );
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const clearAlert = () => setNewBookingAlert(null);

  return {
    bookings: dateBookings,
    stats,
    isLoading,
    isActionLoading,
    error,
    newBookingAlert,
    clearAlert,
    refresh: fetchBookings,
    completeBooking,
    markNoShow,
    cancelBooking,
  };
}
