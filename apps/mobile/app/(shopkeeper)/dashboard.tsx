// ============================================================
// BarberQ — Shopkeeper Dashboard & Live Queue Screen
// Live daily schedule, real-time booking queue, daily metrics,
// and booking lifecycle actions (Complete, Cancel, No-Show).
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { useShopkeeperBookings } from '@/hooks/useShopkeeperBookings';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';
import { Booking, BookingStatus } from '@/types';

export default function ShopkeeperDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { shop, staff, isLoading: isShopLoading } = useShopkeeper();

  // Selected date state (defaults to today)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'>('all');

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Barber unavailable');
  const [customReason, setCustomReason] = useState('');

  // Bookings hook with Realtime sync
  const {
    bookings,
    stats,
    isLoading: isBookingsLoading,
    isActionLoading,
    newBookingAlert,
    clearAlert,
    refresh,
    completeBooking,
    markNoShow,
    cancelBooking,
  } = useShopkeeperBookings({
    shopId: shop?.id,
    selectedDate,
    staffId: selectedStaffId,
    statusFilter,
  });

  // Next 7 days generator for horizontal day selector
  const daysList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ dateStr, dayName, monthDay });
    }
    return list;
  }, []);

  // Cross-platform confirmation helper
  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ]);
    }
  };

  // 1. Complete Booking Action
  const handleComplete = (booking: Booking) => {
    confirmAction(
      'Complete Appointment',
      `Mark appointment for ${booking.customer?.full_name || 'Customer'} (${booking.service_name}) as completed?`,
      async () => {
        try {
          await completeBooking(booking.id);
        } catch (err: any) {
          const msg = err.message || 'Failed to complete booking';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        }
      }
    );
  };

  // 2. Mark No-Show Action
  const handleNoShow = (booking: Booking) => {
    confirmAction(
      'Mark Customer as No-Show?',
      `Customer did not arrive for their appointment? This will be recorded on their account profile.`,
      async () => {
        try {
          await markNoShow(booking.id);
        } catch (err: any) {
          const msg = err.message || 'Failed to mark no-show';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        }
      }
    );
  };

  // 3. Open Cancel Modal
  const openCancelModal = (booking: Booking) => {
    setTargetBooking(booking);
    setCancelReason('Barber unavailable');
    setCustomReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!targetBooking) return;
    const finalReason = cancelReason === 'Other' ? customReason.trim() || 'Shop cancellation' : cancelReason;

    try {
      await cancelBooking(targetBooking.id, finalReason);
      setCancelModalVisible(false);
      setTargetBooking(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel booking';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // Phone Call
  const handleCall = (phone: string | null | undefined) => {
    if (!phone) {
      const msg = 'No phone number available for this customer.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('No Phone', msg);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Format 12-hour time
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Status badge styling
  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Confirmed' };
      case 'completed':
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366F1', label: 'Completed' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Cancelled' };
      case 'no_show':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'No-Show' };
      default:
        return { bg: Colors.surface, text: Colors.textMuted, label: status };
    }
  };

  if (isShopLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.ownerName}>{user?.full_name ?? 'Shopkeeper'} 👋</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => router.push('/(shopkeeper)/calendar')}
          >
            <Text style={styles.calendarBtnText}>📅 Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => router.push('/(shopkeeper)/shop-profile')}
          >
            <Text style={styles.profileBadgeText}>🏬 {shop?.city ?? 'Settings'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Real-time Alert Banner */}
        {newBookingAlert && (
          <View style={styles.alertBanner}>
            <View style={styles.alertLeft}>
              <Text style={styles.alertIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>New Booking Confirmed!</Text>
                <Text style={styles.alertSub}>
                  {newBookingAlert.service_name} at {formatTime(newBookingAlert.start_time)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.alertClose} onPress={clearAlert}>
              <Text style={styles.alertCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shop Live Status Card */}
        <View style={styles.shopCard}>
          <View style={styles.shopCardTop}>
            <View>
              <Text style={styles.shopName}>{shop?.name ?? 'My Barbershop'}</Text>
              <Text style={styles.shopAddress}>📍 {shop?.address ?? 'No address configured'}</Text>
            </View>
            <View style={[styles.statusBadge, shop?.is_active ? styles.statusActive : styles.statusPaused]}>
              <Text style={styles.statusBadgeText}>
                {shop?.is_active ? '● Live' : '○ Paused'}
              </Text>
            </View>
          </View>
          <View style={styles.shopCardFooter}>
            <Text style={styles.slotStepInfo}>⏱ Slot Interval: {shop?.slot_step_mins ?? 30} mins</Text>
            <Text style={styles.realtimeFeedIndicator}>🟢 Live Feed Active</Text>
          </View>
        </View>

        {/* Today's Performance Metrics Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>📋</Text>
            <Text style={styles.metricValue}>{stats.totalToday}</Text>
            <Text style={styles.metricLabel}>Total Bookings</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>✅</Text>
            <Text style={[styles.metricValue, { color: Colors.success }]}>{stats.completedToday}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>💰</Text>
            <Text style={[styles.metricValue, { color: Colors.accent }]}>₹{stats.revenueToday}</Text>
            <Text style={styles.metricLabel}>Revenue Earned</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>⏳</Text>
            <Text style={[styles.metricValue, { color: Colors.warning }]}>{stats.pendingToday}</Text>
            <Text style={styles.metricLabel}>Queue Left</Text>
          </View>
        </View>

        {/* Date Selector Strip */}
        <View style={styles.dateSelectorSection}>
          <Text style={styles.sectionSubtitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {daysList.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              return (
                <TouchableOpacity
                  key={d.dateStr}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => setSelectedDate(d.dateStr)}
                >
                  <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
                    {d.dayName}
                  </Text>
                  <Text style={[styles.dateChipDate, isSelected && styles.dateChipTextSelected]}>
                    {d.monthDay}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Barber Filter Strip */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedStaffId === null && styles.filterChipActive]}
              onPress={() => setSelectedStaffId(null)}
            >
              <Text style={[styles.filterChipText, selectedStaffId === null && styles.filterChipTextActive]}>
                💈 All Barbers
              </Text>
            </TouchableOpacity>

            {staff.map((st) => {
              const isSelected = selectedStaffId === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedStaffId(isSelected ? null : st.id)}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    ✂️ {st.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.statusTabs}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'confirmed', label: 'Queue' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
              { key: 'no_show', label: 'No-Show' },
            ] as const
          ).map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.statusTab, isSelected && styles.statusTabActive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.statusTabText, isSelected && styles.statusTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Queue Appointments List */}
        <View style={styles.queueHeader}>
          <Text style={styles.sectionTitle}>
            {selectedDate === todayStr ? "Today's Live Queue" : `Schedule (${selectedDate})`}
          </Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {isBookingsLoading ? (
          <ActivityIndicator size="small" color={Colors.accent} style={{ marginVertical: Spacing.xl }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛋️</Text>
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtitle}>
              No bookings match the selected date or filters.
            </Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {bookings.map((booking) => {
              const badge = getStatusBadge(booking.status);
              const isConfirmed = booking.status === 'confirmed';

              return (
                <View key={booking.id} style={styles.bookingCard}>
                  {/* Card Header: Time & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>
                        🕒 {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {/* Customer Info & Call Button */}
                  <View style={styles.customerRow}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {booking.customer?.full_name?.charAt(0) ?? 'C'}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.customerName}>
                          {booking.customer?.full_name ?? 'Customer'}
                        </Text>
                        {(booking.customer?.no_show_count ?? 0) > 0 && (
                          <View style={styles.warningPill}>
                            <Text style={styles.warningPillText}>
                              ⚠️ {booking.customer?.no_show_count} No-Show
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.customerPhone}>
                        📱 {booking.customer?.phone ?? 'No phone'}
                      </Text>
                    </View>
                    {booking.customer?.phone && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCall(booking.customer?.phone)}
                      >
                        <Text style={styles.callButtonText}>📞 Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Service & Staff Details */}
                  <View style={styles.serviceRow}>
                    <View>
                      <Text style={styles.serviceName}>{booking.service_name}</Text>
                      <Text style={styles.serviceMeta}>
                        ⏱ {booking.service_duration_mins} mins • 💈 Barber: {booking.staff_name || booking.staff?.name || 'Any Barber'}
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>₹{booking.service_price}</Text>
                  </View>

                  {/* Customer Note */}
                  {booking.customer_note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>Note from customer:</Text>
                      <Text style={styles.noteContent}>"{booking.customer_note}"</Text>
                    </View>
                  )}

                  {/* Cancellation Reason if cancelled */}
                  {booking.status === 'cancelled' && booking.cancellation_reason && (
                    <View style={styles.cancelReasonBox}>
                      <Text style={styles.cancelReasonText}>
                        Reason: {booking.cancellation_reason} ({booking.cancelled_by ?? 'system'})
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons for Confirmed Bookings */}
                  {isConfirmed && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.completeBtn]}
                        onPress={() => handleComplete(booking)}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.completeBtnText}>✅ Complete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.noShowBtn]}
                        onPress={() => handleNoShow(booking)}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.noShowBtnText}>⚠️ No-Show</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() => openCancelModal(booking)}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.cancelBtnText}>✕ Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Management Shortcuts */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Quick Management</Text>
        <TouchableOpacity
          style={styles.shortcutRow}
          onPress={() => router.push('/(shopkeeper)/services')}
        >
          <View style={styles.shortcutLeft}>
            <Text style={styles.shortcutIcon}>✂️</Text>
            <View>
              <Text style={styles.shortcutTitle}>Services & Price Menu</Text>
              <Text style={styles.shortcutSub}>Add haircuts, beard trims, update prices</Text>
            </View>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutRow}
          onPress={() => router.push('/(shopkeeper)/staff')}
        >
          <View style={styles.shortcutLeft}>
            <Text style={styles.shortcutIcon}>💈</Text>
            <View>
              <Text style={styles.shortcutTitle}>Staff & Barbers</Text>
              <Text style={styles.shortcutSub}>Add barbers, assign skills & chairs</Text>
            </View>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutRow}
          onPress={() => router.push('/(shopkeeper)/hours')}
        >
          <View style={styles.shortcutLeft}>
            <Text style={styles.shortcutIcon}>🕒</Text>
            <View>
              <Text style={styles.shortcutTitle}>Working Hours & Breaks</Text>
              <Text style={styles.shortcutSub}>Configure shop timings and holidays</Text>
            </View>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cancel Appointment Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSubtitle}>
              Please select a reason for cancelling {targetBooking?.customer?.full_name}'s appointment.
            </Text>

            {['Barber unavailable', 'Shop emergency / Power cut', 'Customer phoned to cancel', 'Other'].map(
              (reason) => {
                const isSelected = cancelReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setCancelReason(reason)}
                  >
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {isSelected ? '◉ ' : '○ '} {reason}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}

            {cancelReason === 'Other' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Specify reason..."
                placeholderTextColor={Colors.textMuted}
                value={customReason}
                onChangeText={setCustomReason}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  greeting: { fontSize: Typography.sm, color: Colors.textSecondary },
  ownerName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  calendarBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  calendarBtnText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.accent },
  profileBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  profileBadgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  // Alert Banner
  alertBanner: {
    backgroundColor: '#312E81',
    borderColor: '#6366F1',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.md,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  alertIcon: { fontSize: 24 },
  alertTitle: { fontSize: Typography.sm, fontWeight: Typography.bold, color: '#fff' },
  alertSub: { fontSize: Typography.xs, color: '#C7D2FE', marginTop: 2 },
  alertClose: { padding: Spacing.xs },
  alertCloseText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },

  // Shop Card
  shopCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  shopCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: '#fff' },
  shopAddress: { fontSize: Typography.xs, color: '#94A3B8', marginTop: 4 },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: Radius.full },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusPaused: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusBadgeText: { fontSize: 11, fontWeight: Typography.bold, color: '#10B981' },
  shopCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  slotStepInfo: { fontSize: Typography.xs, color: '#CBD5E1' },
  realtimeFeedIndicator: { fontSize: Typography.xs, color: '#10B981', fontWeight: Typography.semibold },

  // Metrics Grid
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  sectionSubtitle: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textMuted, marginBottom: 6 },
  metricsGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 3,
    ...Shadow.sm,
  },
  metricIcon: { fontSize: 18 },
  metricValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  metricLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  // Date Selector
  dateSelectorSection: { marginTop: Spacing.xs },
  dateScroll: { gap: Spacing.xs },
  dateChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  dateChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dateChipDay: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  dateChipDate: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  dateChipTextSelected: { color: '#fff' },

  // Filter Strips
  filterSection: { marginTop: Spacing.xs },
  filterScroll: { gap: Spacing.xs },
  filterChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: Colors.accent,
  },
  filterChipText: { fontSize: Typography.xs, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.accent, fontWeight: Typography.bold },

  // Status Tabs
  statusTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  statusTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: Radius.md },
  statusTabActive: { backgroundColor: Colors.accent },
  statusTabText: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.textMuted },
  statusTabTextActive: { color: '#fff', fontWeight: Typography.bold },

  // Queue List
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  refreshBtn: { padding: 4 },
  refreshBtnText: { fontSize: Typography.xs, color: Colors.accent, fontWeight: Typography.semibold },
  emptyContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySubtitle: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },

  queueList: { gap: Spacing.md },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  timeBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary },
  statusPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full },
  statusPillText: { fontSize: 10, fontWeight: Typography.bold },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  customerDetails: { flex: 1 },
  customerName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  customerPhone: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  warningPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  warningPillText: { fontSize: 9, color: '#F59E0B', fontWeight: Typography.bold },
  callButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  callButtonText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: '#10B981' },

  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  serviceName: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  serviceMeta: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  servicePrice: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.accent },

  noteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  noteLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.semibold },
  noteContent: { fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 2 },

  cancelReasonBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.xs + 2,
    borderRadius: Radius.md,
  },
  cancelReasonText: { fontSize: 10, color: '#EF4444' },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: { backgroundColor: Colors.success },
  completeBtnText: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.bold },
  noShowBtn: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: '#F59E0B' },
  noShowBtnText: { color: '#F59E0B', fontSize: Typography.xs, fontWeight: Typography.bold },
  cancelBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontSize: Typography.xs, fontWeight: Typography.bold },

  // Shortcuts
  shortcutRow: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  shortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  shortcutIcon: { fontSize: 24 },
  shortcutTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  shortcutSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: Typography.base, color: Colors.textMuted },

  // Cancel Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  modalSubtitle: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 8 },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: Colors.accent,
  },
  reasonText: { fontSize: Typography.sm, color: Colors.textSecondary },
  reasonTextSelected: { color: Colors.accent, fontWeight: Typography.bold },
  customReasonInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.xs,
    marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelBtnText: { color: Colors.textMuted, fontWeight: Typography.semibold, fontSize: Typography.sm },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  modalConfirmBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.sm },
});
