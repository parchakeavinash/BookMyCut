// ============================================================
// BarberQ — Shopkeeper Schedule & Calendar Screen
// Week view with appointment dots, day-by-day appointment timeline,
// chair/stylist filtering, block/unblock date (shop_closed_dates),
// and full appointment detail modal (Confirm, Complete, Cancel, No-Show).
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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';
import { Booking, BookingStatus } from '@/types';

export default function ShopkeeperCalendarScreen() {
  const router = useRouter();
  const {
    shop,
    staff,
    closedDates,
    addClosedDate,
    deleteClosedDate,
    isLoading: isShopLoading,
  } = useShopkeeper();

  // Format today as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Appointment Detail Modal State
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Barber unavailable');
  const [customReason, setCustomReason] = useState('');

  // Block Date Modal State
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockReason, setBlockReason] = useState('Public Holiday');
  const [customBlockReason, setCustomBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  // Bookings hook with weekCounts
  const {
    bookings,
    weekCounts,
    isLoading: isBookingsLoading,
    isActionLoading,
    refresh,
    confirmBooking,
    completeBooking,
    markNoShow,
    cancelBooking,
  } = useShopkeeperBookings({
    shopId: shop?.id,
    selectedDate,
    staffId: selectedStaffId,
    statusFilter: 'all',
  });

  // Calendar dates (18-day rolling window: 3 past days, today, 14 future days)
  const calendarDays = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = -3; i <= 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      list.push({ dateStr, dayName, dayNum, monthName, isPast: i < 0 });
    }
    return list;
  }, []);

  // Check if active selected date is blocked in shop_closed_dates
  const activeClosedDate = useMemo(() => {
    return closedDates.find((cd) => cd.closed_date === selectedDate) || null;
  }, [closedDates, selectedDate]);

  // Format 12-hour time
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

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

  // 1. Complete
  const handleComplete = (booking: Booking) => {
    confirmAction(
      'Complete Appointment',
      `Mark appointment for ${booking.customer?.full_name || 'Customer'} as completed?`,
      async () => {
        try {
          await completeBooking(booking.id);
          setDetailBooking(null);
        } catch (err: any) {
          const msg = err.message || 'Failed to complete booking';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        }
      }
    );
  };

  // 2. No-Show
  const handleNoShow = (booking: Booking) => {
    confirmAction(
      'Mark Customer as No-Show?',
      `Record no-show penalty for ${booking.customer?.full_name || 'Customer'}?`,
      async () => {
        try {
          await markNoShow(booking.id);
          setDetailBooking(null);
        } catch (err: any) {
          const msg = err.message || 'Failed to mark no-show';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        }
      }
    );
  };

  // 3. Confirm
  const handleConfirm = async (booking: Booking) => {
    try {
      await confirmBooking(booking.id);
      setDetailBooking(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to confirm booking';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // 4. Cancel
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
      setDetailBooking(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel booking';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // 5. Block Date Action
  const handleBlockDate = async () => {
    const finalReason = blockReason === 'Other' ? customBlockReason.trim() || 'Shop Closed' : blockReason;
    setIsBlocking(true);
    try {
      await addClosedDate(selectedDate, finalReason);
      setBlockModalVisible(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to block date';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsBlocking(false);
    }
  };

  // 6. Unblock Date Action
  const handleUnblockDate = (closedDateId: string) => {
    confirmAction(
      'Unblock This Date',
      'Make this date available for customer bookings again?',
      async () => {
        try {
          await deleteClosedDate(closedDateId);
        } catch (err: any) {
          const msg = err.message || 'Failed to unblock date';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        }
      }
    );
  };

  const handleCall = (phone: string | null | undefined) => {
    if (!phone) {
      const msg = 'No phone number available.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('No Phone', msg);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

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

  const activeDateLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  if (isShopLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Shop Schedule</Text>
          <Text style={styles.screenSubtitle}>{activeDateLabel}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Calendar Week View with Appointment Dots */}
      <View style={styles.calendarStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
          {calendarDays.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            const count = weekCounts[item.dateStr] || 0;
            const isBlocked = closedDates.some((cd) => cd.closed_date === item.dateStr);

            return (
              <TouchableOpacity
                key={item.dateStr}
                style={[
                  styles.dayCard,
                  isSelected && styles.dayCardSelected,
                  isBlocked && !isSelected && styles.dayCardBlocked,
                  item.isPast && !isSelected && styles.dayCardPast,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
              >
                <Text style={[styles.dayCardName, isSelected && styles.dayCardTextSelected]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.dayCardNum, isSelected && styles.dayCardTextSelected]}>
                  {item.dayNum}
                </Text>
                <Text style={[styles.dayCardMonth, isSelected && styles.dayCardTextSelected]}>
                  {item.monthName}
                </Text>

                {/* Appointment Dots Indicator */}
                <View style={styles.dotsRow}>
                  {isBlocked ? (
                    <Text style={{ fontSize: 9 }}>🔒</Text>
                  ) : count > 0 ? (
                    <View style={styles.dotBadge}>
                      <View style={[styles.dot, isSelected && { backgroundColor: '#fff' }]} />
                      <Text style={[styles.dotCountText, isSelected && { color: '#fff' }]}>
                        {count}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.dotPlaceholder} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Block Date Banner or Button */}
      <View style={styles.blockDateBar}>
        {activeClosedDate ? (
          <View style={styles.blockedBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockedTitle}>🔒 Salon Closed This Day</Text>
              <Text style={styles.blockedSub}>
                Reason: {activeClosedDate.reason || 'Closed for bookings'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={() => handleUnblockDate(activeClosedDate.id)}
            >
              <Text style={styles.unblockBtnText}>Unblock Day</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unblockedBar}>
            <Text style={styles.unblockedText}>Day open for bookings</Text>
            <TouchableOpacity
              style={styles.blockThisDateBtn}
              onPress={() => {
                setBlockReason('Public Holiday');
                setCustomBlockReason('');
                setBlockModalVisible(true);
              }}
            >
              <Text style={styles.blockThisDateText}>🚫 Block This Date</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stylist Filter Strip */}
      <View style={styles.stylistFilterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stylistFilterScroll}>
          <TouchableOpacity
            style={[styles.stylistChip, selectedStaffId === null && styles.stylistChipActive]}
            onPress={() => setSelectedStaffId(null)}
          >
            <Text style={[styles.stylistChipText, selectedStaffId === null && styles.stylistChipTextActive]}>
              💈 All Chairs ({staff.length})
            </Text>
          </TouchableOpacity>

          {staff.map((st) => {
            const isSelected = selectedStaffId === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.stylistChip, isSelected && styles.stylistChipActive]}
                onPress={() => setSelectedStaffId(isSelected ? null : st.id)}
              >
                <Text style={[styles.stylistChipText, isSelected && styles.stylistChipTextActive]}>
                  ✂️ {st.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Schedule Timeline */}
      <ScrollView contentContainerStyle={styles.timelineContent} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>
            Appointments ({bookings.length})
          </Text>
          <Text style={styles.totalRevenueBadge}>
            ₹{bookings.reduce((sum, b) => sum + (b.status === 'completed' ? Number(b.service_price) : 0), 0)} Completed
          </Text>
        </View>

        {isBookingsLoading ? (
          <ActivityIndicator size="small" color={Colors.accent} style={{ marginVertical: Spacing.xl }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>No Appointments Scheduled</Text>
            <Text style={styles.emptySubtitle}>
              {activeClosedDate
                ? 'This date is blocked. Customers cannot book on this day.'
                : 'All chairs are open for walk-ins or new online bookings on this date.'}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {bookings.map((b) => {
              const badge = getStatusBadge(b.status);
              const isConfirmed = b.status === 'confirmed';

              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.bookingCard}
                  activeOpacity={0.85}
                  onPress={() => setDetailBooking(b)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.timeTag}>
                      <Text style={styles.timeTagText}>
                        🕒 {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusTagText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{b.customer?.full_name || 'Customer'}</Text>
                      <Text style={styles.serviceTitle}>{b.service_name} (₹{b.service_price})</Text>
                      <Text style={styles.staffLabel}>
                        💈 Stylist: {b.staff_name || b.staff?.name || 'Any Barber'}
                      </Text>
                    </View>

                    {b.customer?.phone && (
                      <TouchableOpacity
                        style={styles.callCircle}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(b.customer?.phone);
                        }}
                      >
                        <Text style={styles.callCircleText}>📞</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {b.customer_note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>"{b.customer_note}"</Text>
                    </View>
                  )}

                  {isConfirmed && (
                    <View style={styles.actionsBar}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionComplete]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleComplete(b);
                        }}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.actionCompleteText}>✅ Complete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionNoShow]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleNoShow(b);
                        }}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.actionNoShowText}>⚠️ No-Show</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionCancel]}
                        onPress={(e) => {
                          e.stopPropagation();
                          openCancelModal(b);
                        }}
                        disabled={isActionLoading}
                      >
                        <Text style={styles.actionCancelText}>✕ Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Appointment Detail Modal */}
      <Modal visible={!!detailBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setDetailBooking(null)}>
                <Text style={{ fontSize: 18, color: Colors.textMuted, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailBooking && (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: Spacing.sm }}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>CUSTOMER</Text>
                    <Text style={styles.detailValueBold}>{detailBooking.customer?.full_name || 'Customer'}</Text>
                    <Text style={styles.detailValue}>Phone: {detailBooking.customer?.phone || 'Not provided'}</Text>
                    {(detailBooking.customer?.no_show_count ?? 0) > 0 && (
                      <Text style={{ color: '#F59E0B', fontSize: Typography.xs, fontWeight: 'bold' }}>
                        ⚠️ Past No-Shows: {detailBooking.customer?.no_show_count}
                      </Text>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>SERVICE & BARBER</Text>
                    <Text style={styles.detailValueBold}>{detailBooking.service_name}</Text>
                    <Text style={styles.detailValue}>
                      ₹{detailBooking.service_price} • {detailBooking.service_duration_mins} mins
                    </Text>
                    <Text style={styles.detailValue}>
                      Stylist: {detailBooking.staff_name || detailBooking.staff?.name || 'Any Barber'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>SCHEDULED TIME</Text>
                    <Text style={styles.detailValueBold}>
                      {formatTime(detailBooking.start_time)} – {formatTime(detailBooking.end_time)}
                    </Text>
                    <Text style={styles.detailValue}>Status: {detailBooking.status.toUpperCase()}</Text>
                  </View>

                  {detailBooking.customer_note && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>CUSTOMER NOTE</Text>
                      <Text style={[styles.detailValue, { fontStyle: 'italic' }]}>
                        "{detailBooking.customer_note}"
                      </Text>
                    </View>
                  )}

                  {detailBooking.status === 'confirmed' && (
                    <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
                      <TouchableOpacity
                        style={[styles.modalActionBtn, { backgroundColor: Colors.success }]}
                        onPress={() => handleComplete(detailBooking)}
                      >
                        <Text style={styles.modalActionBtnText}>✅ Mark as Completed</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalActionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: '#F59E0B' }]}
                        onPress={() => handleNoShow(detailBooking)}
                      >
                        <Text style={[styles.modalActionBtnText, { color: '#F59E0B' }]}>⚠️ Mark as No-Show</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444' }]}
                        onPress={() => openCancelModal(detailBooking)}
                      >
                        <Text style={[styles.modalActionBtnText, { color: '#EF4444' }]}>✕ Cancel Appointment</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSubtitle}>
              Please select a cancellation reason for {targetBooking?.customer?.full_name}.
            </Text>

            {['Barber unavailable', 'Shop emergency', 'Customer requested cancellation', 'Other'].map(
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
                <Text style={styles.modalCancelBtnText}>Back</Text>
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

      {/* Block Date Modal */}
      <Modal visible={blockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Block Date ({selectedDate})</Text>
            <Text style={styles.modalSubtitle}>
              Blocking this date will stop customers from booking appointments on this day.
            </Text>

            {['Public Holiday', 'Salon Maintenance / Renovation', 'Staff Training / Team Outing', 'Other'].map(
              (reason) => {
                const isSelected = blockReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setBlockReason(reason)}
                  >
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {isSelected ? '◉ ' : '○ '} {reason}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}

            {blockReason === 'Other' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Reason for closing salon..."
                placeholderTextColor={Colors.textMuted}
                value={customBlockReason}
                onChangeText={setCustomBlockReason}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBlockModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#F59E0B' }]}
                onPress={handleBlockDate}
                disabled={isBlocking}
              >
                {isBlocking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Block Date</Text>
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
  screenTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  screenSubtitle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  refreshBtn: {
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshBtnText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.accent },

  calendarStripContainer: { marginTop: Spacing.xs },
  calendarStrip: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  dayCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minWidth: 64,
    ...Shadow.sm,
  },
  dayCardSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dayCardBlocked: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  dayCardPast: { opacity: 0.5 },
  dayCardName: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.textMuted },
  dayCardNum: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginVertical: 2 },
  dayCardMonth: { fontSize: 10, color: Colors.textMuted },
  dayCardTextSelected: { color: '#fff' },

  // Dots Row
  dotsRow: { marginTop: 4, height: 14, justifyContent: 'center', alignItems: 'center' },
  dotBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  dotCountText: { fontSize: 9, fontWeight: Typography.bold, color: Colors.success },
  dotPlaceholder: { height: 5 },

  // Block Date Bar
  blockDateBar: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  blockedBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockedTitle: { fontSize: Typography.xs, fontWeight: Typography.bold, color: '#F59E0B' },
  blockedSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  unblockBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  unblockBtnText: { fontSize: 10, fontWeight: Typography.bold, color: '#fff' },

  unblockedBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unblockedText: { fontSize: Typography.xs, color: Colors.textMuted },
  blockThisDateBtn: { paddingVertical: 2, paddingHorizontal: 6 },
  blockThisDateText: { fontSize: Typography.xs, color: '#F59E0B', fontWeight: Typography.semibold },

  stylistFilterSection: { marginTop: Spacing.sm },
  stylistFilterScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  stylistChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  stylistChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: Colors.accent,
  },
  stylistChipText: { fontSize: Typography.xs, color: Colors.textMuted },
  stylistChipTextActive: { color: Colors.accent, fontWeight: Typography.bold },

  timelineContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  totalRevenueBadge: { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.bold },

  emptyCard: {
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

  timelineList: { gap: Spacing.md },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  timeTagText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary },
  statusTag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full },
  statusTagText: { fontSize: 10, fontWeight: Typography.bold },

  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  serviceTitle: { fontSize: Typography.xs, color: Colors.accent, fontWeight: Typography.semibold, marginTop: 2 },
  staffLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  callCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callCircleText: { fontSize: 16 },

  noteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: Spacing.xs + 2,
    borderRadius: Radius.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  noteText: { fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic' },

  actionsBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionComplete: { backgroundColor: Colors.success },
  actionCompleteText: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.bold },
  actionNoShow: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: '#F59E0B' },
  actionNoShowText: { color: '#F59E0B', fontSize: Typography.xs, fontWeight: Typography.bold },
  actionCancel: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444' },
  actionCancelText: { color: '#EF4444', fontSize: Typography.xs, fontWeight: Typography.bold },

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
  detailSection: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: 2,
  },
  detailLabel: { fontSize: 9, fontWeight: Typography.bold, color: Colors.textMuted },
  detailValueBold: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  detailValue: { fontSize: Typography.xs, color: Colors.textSecondary },
  modalActionBtn: {
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  modalActionBtnText: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.bold },

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
