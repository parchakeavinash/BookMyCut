// ============================================================
// BarberQ — Slot Selection & Real-Time Availability Feed Screen
// Features: Next 7-day selector, Barber picker, Grouped slot grid,
// and Supabase Realtime live updates.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAvailability, FormattedSlot } from '@/hooks/useAvailability';
import { getShopDetails } from '@/hooks/useDiscovery';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';
import { Shop, Service, Staff } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

interface DayOption {
  dateString: string; // 'YYYY-MM-DD'
  dayName: string;    // 'Mon'
  dayNumber: number;  // 23
  monthName: string;  // 'Sep'
  badge?: string;     // 'Today' | 'Tomorrow'
}

export default function SlotSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shopId?: string; serviceId?: string; staffId?: string }>();

  const draftStore = useBookingDraftStore();

  const [shop, setShop] = useState<Shop | null>(draftStore.shop);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(draftStore.service);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(draftStore.staff);

  // Generate next 7 days
  const dateOptions: DayOption[] = useMemo(() => {
    const days: DayOption[] = [];
    const now = new Date();
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      let badge: string | undefined;
      if (i === 0) badge = 'Today';
      else if (i === 1) badge = 'Tomorrow';

      days.push({
        dateString,
        dayName: dayShorts[d.getDay()],
        dayNumber: d.getDate(),
        monthName: monthShorts[d.getMonth()],
        badge,
      });
    }
    return days;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(
    draftStore.selectedDate || dateOptions[0].dateString
  );
  const [selectedSlot, setSelectedSlot] = useState<FormattedSlot | null>(null);

  // Load shop details if not already in store
  const targetShopId = params.shopId || draftStore.shop?.id;

  useEffect(() => {
    if (!targetShopId) return;

    getShopDetails(targetShopId).then((data) => {
      setShop(data.shop);
      setServices(data.services);
      setStaffList(data.staff);

      draftStore.setShop(data.shop);

      // Select initial service
      if (!selectedService && data.services.length > 0) {
        const found = params.serviceId
          ? data.services.find((s) => s.id === params.serviceId) || data.services[0]
          : data.services[0];
        setSelectedService(found);
        draftStore.setService(found);
      }

      // Select initial staff if provided
      if (params.staffId) {
        const foundStaff = data.staff.find((st) => st.id === params.staffId);
        if (foundStaff) {
          setSelectedStaff(foundStaff);
          draftStore.setStaff(foundStaff);
        }
      }
    });
  }, [targetShopId]);

  // Hook into Real-Time Availability Feed
  const {
    groupedSlots,
    totalAvailable,
    isLoading,
    isLive,
    refreshSlots,
  } = useAvailability({
    shopId: shop?.id,
    serviceId: selectedService?.id,
    date: selectedDate,
    staffId: selectedStaff?.id,
  });

  const handleSelectService = (srv: Service) => {
    setSelectedService(srv);
    draftStore.setService(srv);
    setSelectedSlot(null);
  };

  const handleSelectStaff = (st: Staff | null) => {
    setSelectedStaff(st);
    draftStore.setStaff(st);
    setSelectedSlot(null);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    draftStore.setDate(dateStr);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: FormattedSlot) => {
    setSelectedSlot(slot);
    draftStore.setSlot(slot.slot_time);
  };

  const handleProceedToCheckout = () => {
    if (!shop || !selectedService || !selectedSlot) {
      Alert.alert('Selection Incomplete', 'Please pick an appointment time slot.');
      return;
    }

    draftStore.setShop(shop);
    draftStore.setService(selectedService);
    draftStore.setStaff(selectedStaff);
    draftStore.setDate(selectedDate);
    draftStore.setSlot(selectedSlot.slot_time);

    router.push('/(customer)/shop/checkout' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => router.back()}>
          <Text style={styles.roundBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Select Slot</Text>
          <View style={styles.liveBadgeRow}>
            <View style={[styles.liveDot, isLive ? styles.liveDotOn : styles.liveDotConnecting]} />
            <Text style={styles.liveText}>{isLive ? 'Live Feed' : 'Connecting...'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.roundBtn} onPress={refreshSlots}>
          <Text style={styles.roundBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Summary Card */}
        <View style={styles.serviceSummaryCard}>
          <View style={styles.serviceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceShopName}>📍 {shop?.name ?? 'Barbershop'}</Text>
              <Text style={styles.serviceName}>{selectedService?.name ?? 'Select Service'}</Text>
              <Text style={styles.servicePrice}>
                ₹{selectedService?.price} • ⏱ {selectedService?.duration_mins} mins
              </Text>
            </View>
          </View>

          {/* Service Switcher Chips */}
          {services.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChipsScroll}>
              {services.map((srv) => (
                <TouchableOpacity
                  key={srv.id}
                  style={[styles.serviceChip, selectedService?.id === srv.id && styles.serviceChipActive]}
                  onPress={() => handleSelectService(srv)}
                >
                  <Text style={[styles.serviceChipText, selectedService?.id === srv.id && styles.serviceChipTextActive]}>
                    {srv.name} (₹{srv.price})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Date Selector (Horizontal Carousel) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateCarousel}>
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.dateString;
              return (
                <TouchableOpacity
                  key={opt.dateString}
                  style={[styles.datePill, isSelected && styles.datePillActive]}
                  onPress={() => handleSelectDate(opt.dateString)}
                  activeOpacity={0.85}
                >
                  {opt.badge && (
                    <View style={[styles.dateBadge, isSelected && styles.dateBadgeActive]}>
                      <Text style={[styles.dateBadgeText, isSelected && styles.dateBadgeTextActive]}>
                        {opt.badge}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.dateDayName, isSelected && styles.dateTextActive]}>
                    {opt.dayName}
                  </Text>
                  <Text style={[styles.dateNumber, isSelected && styles.dateTextActive]}>
                    {opt.dayNumber}
                  </Text>
                  <Text style={[styles.dateMonthName, isSelected && styles.dateTextActive]}>
                    {opt.monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Barber / Stylist Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Stylist</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stylistScroll}>
            {/* Any Available Option */}
            <TouchableOpacity
              style={[styles.stylistChip, !selectedStaff && styles.stylistChipActive]}
              onPress={() => handleSelectStaff(null)}
            >
              <Text style={styles.stylistIcon}>💈</Text>
              <View>
                <Text style={[styles.stylistName, !selectedStaff && styles.stylistTextActive]}>
                  Any Barber
                </Text>
                <Text style={styles.stylistSub}>Maximum availability</Text>
              </View>
            </TouchableOpacity>

            {/* Individual Barbers */}
            {staffList.map((st) => {
              const isSelected = selectedStaff?.id === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.stylistChip, isSelected && styles.stylistChipActive]}
                  onPress={() => handleSelectStaff(st)}
                >
                  <Image
                    source={{ uri: st.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' }}
                    style={styles.stylistAvatar}
                  />
                  <View>
                    <Text style={[styles.stylistName, isSelected && styles.stylistTextActive]}>
                      {st.name}
                    </Text>
                    <Text style={styles.stylistSub}>{st.bio || 'Stylist'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Available Time Slots Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            <Text style={styles.availableCountBadge}>
              {totalAvailable} {totalAvailable === 1 ? 'slot' : 'slots'} open
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.loadingSlotText}>Calculating open appointment slots...</Text>
            </View>
          ) : totalAvailable === 0 ? (
            <View style={styles.noSlotsBox}>
              <Text style={styles.noSlotsIcon}>📅</Text>
              <Text style={styles.noSlotsTitle}>No slots available</Text>
              <Text style={styles.noSlotsSub}>
                The shop is either closed or fully booked on this date. Try selecting another date or "Any Barber".
              </Text>
            </View>
          ) : (
            <View style={styles.slotGroupsContainer}>
              {/* Morning Slots */}
              {groupedSlots.morning.length > 0 && (
                <SlotPeriodGroup
                  title="🌅 Morning"
                  sub="Before 12:00 PM"
                  slots={groupedSlots.morning}
                  selectedSlot={selectedSlot}
                  onSelect={handleSelectSlot}
                />
              )}

              {/* Afternoon Slots */}
              {groupedSlots.afternoon.length > 0 && (
                <SlotPeriodGroup
                  title="☀️ Afternoon"
                  sub="12:00 PM – 05:00 PM"
                  slots={groupedSlots.afternoon}
                  selectedSlot={selectedSlot}
                  onSelect={handleSelectSlot}
                />
              )}

              {/* Evening Slots */}
              {groupedSlots.evening.length > 0 && (
                <SlotPeriodGroup
                  title="🌙 Evening"
                  sub="After 05:00 PM"
                  slots={groupedSlots.evening}
                  selectedSlot={selectedSlot}
                  onSelect={handleSelectSlot}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarLabel}>Selected Appointment</Text>
          <Text style={styles.bottomBarTime} numberOfLines={1}>
            {selectedSlot
              ? `${selectedSlot.displayTime} • ${selectedDate}`
              : 'Choose a time slot'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, !selectedSlot && styles.btnDisabled]}
          onPress={handleProceedToCheckout}
          disabled={!selectedSlot}
        >
          <Text style={styles.checkoutBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SlotPeriodGroup({
  title,
  sub,
  slots,
  selectedSlot,
  onSelect,
}: {
  title: string;
  sub: string;
  slots: FormattedSlot[];
  selectedSlot: FormattedSlot | null;
  onSelect: (slot: FormattedSlot) => void;
}) {
  return (
    <View style={styles.periodCard}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodTitle}>{title}</Text>
        <Text style={styles.periodSub}>{sub}</Text>
      </View>

      <View style={styles.slotsGrid}>
        {slots.map((s) => {
          const isSelected = selectedSlot?.slot_time === s.slot_time;
          return (
            <TouchableOpacity
              key={s.slot_time}
              style={[styles.slotItem, isSelected && styles.slotItemSelected]}
              onPress={() => onSelect(s)}
              activeOpacity={0.85}
            >
              <Text style={[styles.slotItemText, isSelected && styles.slotItemTextSelected]}>
                {s.displayTime}
              </Text>
              {s.available_staff_count > 1 && (
                <Text style={[styles.slotStaffCount, isSelected && styles.slotStaffCountSelected]}>
                  {s.available_staff_count} barbers
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBtnText: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.bold },
  topBarCenter: { alignItems: 'center' },
  topBarTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveDotOn: { backgroundColor: Colors.success },
  liveDotConnecting: { backgroundColor: Colors.warning },
  liveText: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.medium },
  scrollContent: { paddingBottom: 110 },
  serviceSummaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceShopName: { fontSize: Typography.xs, color: Colors.textMuted },
  serviceName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  servicePrice: { fontSize: Typography.sm, color: Colors.success, fontWeight: Typography.bold, marginTop: 2 },
  serviceChipsScroll: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  serviceChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    marginRight: Spacing.xs,
  },
  serviceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  serviceChipText: { fontSize: 11, color: Colors.textSecondary },
  serviceChipTextActive: { color: '#fff', fontWeight: Typography.bold },
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  availableCountBadge: { fontSize: Typography.xs, color: Colors.accent, fontWeight: Typography.semibold },
  dateCarousel: { flexDirection: 'row', marginTop: Spacing.xs },
  datePill: {
    width: 68,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: Spacing.sm,
    gap: 2,
    position: 'relative',
    ...Shadow.sm,
  },
  datePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#EEF2FF',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
  },
  dateBadgeActive: { backgroundColor: Colors.accent },
  dateBadgeText: { fontSize: 9, fontWeight: Typography.bold, color: Colors.accent },
  dateBadgeTextActive: { color: '#fff' },
  dateDayName: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold },
  dateNumber: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  dateMonthName: { fontSize: 10, color: Colors.textSecondary },
  dateTextActive: { color: '#fff' },
  stylistScroll: { flexDirection: 'row', marginTop: Spacing.xs },
  stylistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  stylistChipActive: { borderColor: Colors.accent, backgroundColor: '#FAFAFF' },
  stylistIcon: { fontSize: 24 },
  stylistAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border },
  stylistName: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  stylistSub: { fontSize: 10, color: Colors.textMuted },
  stylistTextActive: { color: Colors.accent },
  loadingBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  loadingSlotText: { fontSize: Typography.xs, color: Colors.textMuted },
  noSlotsBox: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  noSlotsIcon: { fontSize: 32 },
  noSlotsTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  noSlotsSub: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
  slotGroupsContainer: { gap: Spacing.md, marginTop: Spacing.xs },
  periodCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  periodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodTitle: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  periodSub: { fontSize: 10, color: Colors.textMuted },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slotItem: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 88,
  },
  slotItemSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  slotItemText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  slotItemTextSelected: { color: '#fff', fontWeight: Typography.bold },
  slotStaffCount: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  slotStaffCountSelected: { color: 'rgba(255,255,255,0.8)' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.md,
  },
  bottomBarInfo: { flex: 1, marginRight: Spacing.md },
  bottomBarLabel: { fontSize: 10, color: Colors.textMuted },
  bottomBarTime: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  checkoutBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  btnDisabled: { opacity: 0.4 },
  checkoutBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});
