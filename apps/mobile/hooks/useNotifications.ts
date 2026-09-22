// ============================================================
// BarberQ — useNotifications Hook
// Fetches user notifications, manages read status, unread count,
// and subscribes to Supabase Realtime for instant notification alerts.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Notification } from '@/types';
import { registerForPushNotificationsAsync, configureForegroundNotifications } from '@/services/notificationService';

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize foreground notification handler and register push token
  useEffect(() => {
    configureForegroundNotifications();
    if (user?.id) {
      registerForPushNotificationsAsync(user.id).catch(() => {});
    }
  }, [user?.id]);

  // Fetch notifications for current user
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (fetchErr) throw fetchErr;

      setNotifications((data || []) as Notification[]);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription to notifications for this user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Unread notifications count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await supabase.rpc('mark_all_notifications_read', {
        p_user_id: user.id,
      });
    } catch {
      // Fallback direct update
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refresh: () => fetchNotifications(true),
    markAsRead,
    markAllAsRead,
  };
}
