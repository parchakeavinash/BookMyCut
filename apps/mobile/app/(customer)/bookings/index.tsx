// ============================================================
// BarberQ — Customer "My Bookings" Screen
// Tabs for Upcoming and Past bookings with status badges and cancellation.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerBookings } from '@/hooks/useCustomerBookings';
import { Booking } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function CustomerBookingsScreen() {
  const router = useRouter();
  const {
    upcomingBookings,
    pastBookings,
    isLoading,
    refreshBookings,
    cancelBooking,
  } = useCustomerBookings();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBookings();
    setRefreshing(false);
  };

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your ${booking.service_name} appointment at ${booking.shops?.name || 'the shop'}?`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await cancelBooking(booking.id, 'Cancelled by customer');
              Alert.alert('Appointment Cancelled', 'Your booking has been cancelled.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel appointment.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const currentList = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
        <Text style={styles.subtitle}>Track and manage your bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            History ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past bookings found'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'upcoming'
                  ? 'Book a haircut with zero waiting time.'
                  : 'Your completed and cancelled appointments will appear here.'}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.replace('/(customer)' as any)}
                >
                  <Text style={styles.exploreBtnText}>Discover Barbershops</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              isCancelling={cancellingId === item.id}
              onCancel={() => handleCancelBooking(item)}
              onBookAgain={() => {
                if (item.shop_id) {
                  router.push(`/(customer)/shop/${item.shop_id}` as any);
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  isCancelling,
  onCancel,
  onBookAgain,
}: {
  booking: Booking;
  isCancelling: boolean;
  onCancel: () => void;
  onBookAgain: () => void;
}) {
  const d = new Date(booking.start_time);
  const formattedDate = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: Colors.statusConfirmed, text: Colors.statusConfirmedText, label: 'Confirmed' };
      case 'completed':
        return { bg: Colors.statusCompleted, text: Colors.statusCompletedText, label: 'Completed' };
      case 'cancelled':
        return { bg: Colors.statusCancelled, text: Colors.statusCancelledText, label: 'Cancelled' };
      case 'no_show':
        return { bg: Colors.statusNoShow, text: Colors.statusNoShowText, label: 'No Show' };
      default:
        return { bg: Colors.surfaceMuted, text: Colors.textMuted, label: status };
    }
  };

  const statusBadge = getStatusStyle(booking.status);

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            {booking.shops?.name || 'Barbershop'}
          </Text>
          <Text style={styles.shopAddress} numberOfLines={1}>
            📍 {booking.shops?.area ? `${booking.shops.area}, ` : ''}{booking.shops?.city || ''}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Appointment Info */}
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.serviceName}>{booking.service_name}</Text>
          <Text style={styles.priceText}>₹{booking.service_price}</Text>
        </View>

        <View style={styles.timeSlotRow}>
          <Text style={styles.timeIcon}>🕒</Text>
          <Text style={styles.timeSlotText}>{formattedDate} at {formattedTime}</Text>
          <Text style={styles.durationBadge}>⏱ {booking.service_duration_mins}m</Text>
        </View>

        {booking.staff_name && (
          <Text style={styles.staffText}>💈 Stylist: {booking.staff_name}</Text>
        )}

        {booking.cancellation_reason && (
          <Text style={styles.cancelReasonText}>
            Reason: {booking.cancellation_reason}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardFooter}>
        {booking.status === 'confirmed' ? (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={Colors.danger} size="small" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.rebookBtn} onPress={onBookAgain}>
            <Text style={styles.rebookBtnText}>Book Again →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: { paddingVertical: Spacing.md, marginRight: Spacing.lg },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  shopAddress: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full },
  statusBadgeText: { fontSize: 11, fontWeight: Typography.bold },
  divider: { height: 1, backgroundColor: Colors.surfaceMuted },
  cardBody: { gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  priceText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.success },
  timeSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  timeIcon: { fontSize: 12 },
  timeSlotText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.accent },
  durationBadge: { fontSize: 11, color: Colors.textMuted },
  staffText: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  cancelReasonText: { fontSize: 11, color: Colors.danger, fontStyle: 'italic', marginTop: 2 },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
    paddingTop: Spacing.sm,
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: Spacing.sm },
  cancelBtnText: { color: Colors.danger, fontSize: Typography.xs, fontWeight: Typography.bold },
  rebookBtn: { paddingVertical: 4, paddingHorizontal: Spacing.sm },
  rebookBtnText: { color: Colors.accent, fontSize: Typography.xs, fontWeight: Typography.bold },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
  exploreBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  exploreBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold },
});
