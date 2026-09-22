// ============================================================
// BarberQ — Notifications Center Screen
// Unified in-app notifications hub for both customers and shopkeepers.
// Supports read/unread tracking, category icons, and appointment deep linking.
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';
import { Notification } from '@/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Helper for category styling & icons
  const getCategoryConfig = (type: string) => {
    switch (type) {
      case 'new_booking':
        return { icon: '💈', bg: 'rgba(99, 102, 241, 0.15)', text: Colors.accent };
      case 'booking_confirmed':
        return { icon: '✅', bg: 'rgba(16, 185, 129, 0.15)', text: Colors.success };
      case 'reminder_30m':
      case 'reminder_24h':
        return { icon: '⏰', bg: 'rgba(245, 158, 11, 0.15)', text: Colors.warning };
      case 'booking_completed':
        return { icon: '✂️', bg: 'rgba(99, 102, 241, 0.15)', text: Colors.accent };
      case 'booking_cancelled':
        return { icon: '❌', bg: 'rgba(239, 68, 68, 0.15)', text: Colors.danger };
      case 'booking_no_show':
        return { icon: '⚠️', bg: 'rgba(245, 158, 11, 0.15)', text: Colors.warning };
      default:
        return { icon: '🔔', bg: Colors.surface, text: Colors.textSecondary };
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (isoString: string) => {
    const now = Date.now();
    const sent = new Date(isoString).getTime();
    const diffMins = Math.floor((now - sent) / (60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle tapping a notification card
  const handlePressNotification = (item: Notification) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }

    // Role-based navigation
    if (user?.role === 'shopkeeper') {
      router.push('/(shopkeeper)/dashboard');
    } else {
      router.push('/(customer)/bookings');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadCountSub}>
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Text style={styles.markAllBtnText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🎉</Text>
          </View>
          <Text style={styles.emptyTitle}>You're All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            When you book appointments, receive reminders, or updates occur, they'll appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={Colors.accent}
            />
          }
        >
          {notifications.map((item) => {
            const config = getCategoryConfig(item.type);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
                activeOpacity={0.8}
                onPress={() => handlePressNotification(item)}
              >
                {/* Category Icon */}
                <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                  <Text style={styles.iconText}>{config.icon}</Text>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]}>
                      {item.title}
                    </Text>
                    <Text style={styles.timeAgoText}>{formatTimeAgo(item.sent_at)}</Text>
                  </View>

                  <Text style={styles.cardBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                </View>

                {/* Unread Blue Dot */}
                {!item.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 20, color: Colors.textPrimary },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  unreadCountSub: { fontSize: Typography.xs, color: Colors.accent, fontWeight: Typography.semibold },
  markAllBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  markAllBtnText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.accent },

  listContent: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 60 },
  notifCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  notifCardUnread: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1, gap: 3 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: Typography.bold, color: Colors.textPrimary },
  timeAgoText: { fontSize: 10, color: Colors.textMuted },
  cardBody: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginTop: 6,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', maxWidth: 280 },
});
