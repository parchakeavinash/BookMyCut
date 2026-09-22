// ============================================================
// BarberQ — useAvailability Hook
// Live availability feed via get_available_slots() RPC + Supabase Realtime
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AvailableSlot } from '@/types';

export interface FormattedSlot extends AvailableSlot {
  displayTime: string; // e.g. "10:30 AM"
  period: 'morning' | 'afternoon' | 'evening';
  hours: number;
}

export function useAvailability({
  shopId,
  serviceId,
  date,
  staffId,
}: {
  shopId?: string;
  serviceId?: string;
  date: string; // 'YYYY-MM-DD'
  staffId?: string | null;
}) {
  const [slots, setSlots] = useState<FormattedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Fetch available slots from RPC
  const fetchSlots = useCallback(async () => {
    if (!shopId || !serviceId || !date) {
      setSlots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('get_available_slots', {
        p_shop_id: shopId,
        p_service_id: serviceId,
        p_date: date,
        p_staff_id: staffId || null,
      });

      if (rpcErr) throw rpcErr;

      const formatted: FormattedSlot[] = (data || []).map((row: AvailableSlot) => {
        const d = new Date(row.slot_time);
        const hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayTime = `${displayHours}:${minutes} ${ampm}`;

        let period: 'morning' | 'afternoon' | 'evening' = 'afternoon';
        if (hours < 12) period = 'morning';
        else if (hours >= 17) period = 'evening';

        return {
          ...row,
          displayTime,
          period,
          hours,
        };
      });

      setSlots(formatted);
    } catch (err: any) {
      console.error('Error fetching available slots:', err);
      setError(err.message || 'Failed to check slot availability');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, serviceId, date, staffId]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Subscribe to Realtime updates on bookings table for this shop
  useEffect(() => {
    if (!shopId) return;

    const channelName = `live-slots-${shopId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          // Re-fetch slots immediately when any booking change occurs at this shop
          fetchSlots();
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [shopId, fetchSlots]);

  // Grouped slots memoized
  const groupedSlots = useMemo(() => {
    return {
      morning: slots.filter((s) => s.period === 'morning'),
      afternoon: slots.filter((s) => s.period === 'afternoon'),
      evening: slots.filter((s) => s.period === 'evening'),
    };
  }, [slots]);

  return {
    slots,
    groupedSlots,
    totalAvailable: slots.length,
    isLoading,
    error,
    isLive,
    refreshSlots: fetchSlots,
  };
}
