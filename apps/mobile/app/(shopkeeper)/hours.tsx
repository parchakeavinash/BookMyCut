// ============================================================
// BarberQ — Shopkeeper Working Hours, Breaks, Overrides & Closed Dates
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const DAYS = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

export default function WorkingHoursScreen() {
  const {
    hours,
    breaks,
    staff,
    staffHours,
    closedDates,
    isLoading,
    saveBusinessHours,
    saveBreaks,
    saveStaffHours,
    addClosedDate,
    deleteClosedDate,
    shop
  } = useShopkeeper();

  const [activeTab, setActiveTab] = useState<'shop' | 'staff' | 'closed'>('shop');
  const [saving, setSaving] = useState(false);

  // Shop hours local state
  const [localHours, setLocalHours] = useState<
    { day_of_week: number; open_time: string; close_time: string; is_open: boolean }[]
  >([]);

  // Breaks local state
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [breakLabel, setBreakLabel] = useState('Lunch Break');

  // Staff override local state
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [localStaffHours, setLocalStaffHours] = useState<
    { day_of_week: number; start_time: string; end_time: string; is_working: boolean }[]
  >([]);

  // Closed date input state
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');

  // Sync loaded business_hours to local state
  useEffect(() => {
    if (hours.length > 0) {
      setLocalHours(
        DAYS.map((d) => {
          const match = hours.find((h) => h.day_of_week === d.day);
          return {
            day_of_week: d.day,
            open_time: match?.open_time ? match.open_time.slice(0, 5) : '09:00',
            close_time: match?.close_time ? match.close_time.slice(0, 5) : '20:00',
            is_open: match ? match.is_open : true,
          };
        })
      );
    } else {
      setLocalHours(
        DAYS.map((d) => ({
          day_of_week: d.day,
          open_time: d.day === 0 ? '10:00' : '09:00',
          close_time: d.day === 0 ? '18:00' : '20:00',
          is_open: true,
        }))
      );
    }

    if (breaks.length > 0) {
      setBreakStart(breaks[0].start_time.slice(0, 5));
      setBreakEnd(breaks[0].end_time.slice(0, 5));
      setBreakLabel(breaks[0].label || 'Lunch Break');
    }
  }, [hours, breaks]);

  // Sync staff selection
  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  // Sync staff hours for selected staff
  useEffect(() => {
    if (!selectedStaffId) return;
    const currentStaffSchedule = staffHours.filter((sh) => sh.staff_id === selectedStaffId);

    setLocalStaffHours(
      DAYS.map((d) => {
        const match = currentStaffSchedule.find((sh) => sh.day_of_week === d.day);
        return {
          day_of_week: d.day,
          start_time: match?.start_time ? match.start_time.slice(0, 5) : '09:00',
          end_time: match?.end_time ? match.end_time.slice(0, 5) : '20:00',
          is_working: match ? match.is_working : true,
        };
      })
    );
  }, [selectedStaffId, staffHours]);

  // Update shop day
  const updateDayHour = (day: number, field: string, value: any) => {
    setLocalHours((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h))
    );
  };

  // Update staff day
  const updateStaffDayHour = (day: number, field: string, value: any) => {
    setLocalStaffHours((prev) =>
      prev.map((sh) => (sh.day_of_week === day ? { ...sh, [field]: value } : sh))
    );
  };

  // Save Shop Hours & Breaks
  const handleSaveShopHours = async () => {
    setSaving(true);
    try {
      await saveBusinessHours(localHours);
      if (breakStart && breakEnd) {
        await saveBreaks([
          {
            start_time: breakStart,
            end_time: breakEnd,
            label: breakLabel,
          },
        ]);
      }
      Alert.alert('Success', 'Shop operating schedule updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save hours.');
    } finally {
      setSaving(false);
    }
  };

  // Save Staff Override
  const handleSaveStaffHours = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      await saveStaffHours(selectedStaffId, localStaffHours);
      Alert.alert('Success', 'Barber custom schedule saved!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save staff hours.');
    } finally {
      setSaving(false);
    }
  };

  // Add Closed Date
  const handleAddClosedDate = async () => {
    if (!newClosedDate.trim()) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    try {
      await addClosedDate(newClosedDate.trim(), newClosedReason.trim() || undefined);
      setNewClosedDate('');
      setNewClosedReason('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add closed date.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Working Hours & Calendar</Text>
          <Text style={styles.subtitle}>{shop?.name ?? 'Manage availability schedule'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'shop' && styles.tabBtnActive]}
          onPress={() => setActiveTab('shop')}
        >
          <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>
            Shop Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'staff' && styles.tabBtnActive]}
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[styles.tabText, activeTab === 'staff' && styles.tabTextActive]}>
            Barber Overrides
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'closed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
            Closed Dates
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* ================= TAB 1: Shop Operating Schedule ================= */}
          {activeTab === 'shop' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Working Hours</Text>
              <Text style={styles.sectionSub}>Set daily open and close times for your shop.</Text>

              {DAYS.map((d) => {
                const dayHour = localHours.find((h) => h.day_of_week === d.day) ?? {
                  day_of_week: d.day,
                  open_time: '09:00',
                  close_time: '20:00',
                  is_open: true,
                };

                return (
                  <View key={d.day} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>{d.label}</Text>
                      <Switch
                        value={dayHour.is_open}
                        onValueChange={(val) => updateDayHour(d.day, 'is_open', val)}
                        trackColor={{ true: Colors.accent, false: Colors.border }}
                      />
                    </View>

                    {dayHour.is_open ? (
                      <View style={styles.timeInputsRow}>
                        <View style={styles.timeInputCol}>
                          <Text style={styles.inputLabel}>Opens</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={dayHour.open_time}
                            onChangeText={(val) => updateDayHour(d.day, 'open_time', val)}
                            placeholder="09:00"
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>
                        <Text style={styles.timeDivider}>to</Text>
                        <View style={styles.timeInputCol}>
                          <Text style={styles.inputLabel}>Closes</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={dayHour.close_time}
                            onChangeText={(val) => updateDayHour(d.day, 'close_time', val)}
                            placeholder="20:00"
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.closedText}>Closed all day</Text>
                    )}
                  </View>
                );
              })}

              {/* Lunch Break Card */}
              <View style={styles.breakCard}>
                <Text style={styles.sectionTitle}>☕ Standard Lunch Break</Text>
                <Text style={styles.sectionSub}>Appointments will not be offered during this window.</Text>

                <View style={styles.timeInputsRow}>
                  <View style={styles.timeInputCol}>
                    <Text style={styles.inputLabel}>Break Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={breakStart}
                      onChangeText={setBreakStart}
                      placeholder="13:00"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <Text style={styles.timeDivider}>to</Text>
                  <View style={styles.timeInputCol}>
                    <Text style={styles.inputLabel}>Break End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={breakEnd}
                      onChangeText={setBreakEnd}
                      placeholder="14:00"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveShopHours}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Shop Hours</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ================= TAB 2: Barber Overrides ================= */}
          {activeTab === 'staff' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Staff Hours Override</Text>
              <Text style={styles.sectionSub}>Customize individual barber working shifts.</Text>

              {/* Staff Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffPicker}>
                {staff.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.staffPill, selectedStaffId === s.id && styles.staffPillActive]}
                    onPress={() => setSelectedStaffId(s.id)}
                  >
                    <Text style={[styles.staffPillText, selectedStaffId === s.id && styles.staffPillTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedStaffId ? (
                <>
                  {DAYS.map((d) => {
                    const sh = localStaffHours.find((item) => item.day_of_week === d.day) ?? {
                      day_of_week: d.day,
                      start_time: '09:00',
                      end_time: '20:00',
                      is_working: true,
                    };

                    return (
                      <View key={d.day} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                          <Text style={styles.dayName}>{d.label}</Text>
                          <Switch
                            value={sh.is_working}
                            onValueChange={(val) => updateStaffDayHour(d.day, 'is_working', val)}
                            trackColor={{ true: Colors.accent, false: Colors.border }}
                          />
                        </View>

                        {sh.is_working ? (
                          <View style={styles.timeInputsRow}>
                            <View style={styles.timeInputCol}>
                              <Text style={styles.inputLabel}>Start</Text>
                              <TextInput
                                style={styles.timeInput}
                                value={sh.start_time}
                                onChangeText={(val) => updateStaffDayHour(d.day, 'start_time', val)}
                              />
                            </View>
                            <Text style={styles.timeDivider}>to</Text>
                            <View style={styles.timeInputCol}>
                              <Text style={styles.inputLabel}>End</Text>
                              <TextInput
                                style={styles.timeInput}
                                value={sh.end_time}
                                onChangeText={(val) => updateStaffDayHour(d.day, 'end_time', val)}
                              />
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.closedText}>Off-duty</Text>
                        )}
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveStaffHours}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Barber Schedule</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.emptySub}>No staff members found. Add staff in the Staff tab first.</Text>
              )}
            </View>
          )}

          {/* ================= TAB 3: Closed Dates ================= */}
          {activeTab === 'closed' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop Closed Dates</Text>
              <Text style={styles.sectionSub}>Block out holidays, renovations, or unexpected closures.</Text>

              {/* Add Closed Date Card */}
              <View style={styles.breakCard}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="2026-10-24"
                  placeholderTextColor={Colors.textMuted}
                  value={newClosedDate}
                  onChangeText={setNewClosedDate}
                />
                <Text style={styles.inputLabel}>Reason (Optional)</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="e.g. Diwali Holiday, Renovation"
                  placeholderTextColor={Colors.textMuted}
                  value={newClosedReason}
                  onChangeText={setNewClosedReason}
                />
                <TouchableOpacity style={styles.addDateBtn} onPress={handleAddClosedDate}>
                  <Text style={styles.addDateBtnText}>+ Add Closed Date</Text>
                </TouchableOpacity>
              </View>

              {/* Existing Closed Dates List */}
              <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Upcoming Scheduled Closures</Text>
              {closedDates.length === 0 ? (
                <Text style={styles.emptySub}>No closed dates scheduled. Shop operates standard hours.</Text>
              ) : (
                closedDates.map((cd) => (
                  <View key={cd.id} style={styles.closedDateRow}>
                    <View>
                      <Text style={styles.closedDateText}>📅 {cd.closed_date}</Text>
                      {cd.reason && <Text style={styles.closedReasonText}>{cd.reason}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => deleteClosedDate(cd.id)} style={styles.delBtn}>
                      <Text style={styles.delBtnText}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, marginRight: Spacing.md },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { gap: Spacing.md },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  sectionSub: { fontSize: Typography.sm, color: Colors.textMuted },
  dayCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  timeInputsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  timeInputCol: { flex: 1 },
  inputLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: 4 },
  timeInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  timeDivider: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 16 },
  closedText: { fontSize: Typography.sm, color: Colors.danger, fontWeight: Typography.medium },
  breakCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.md,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  staffPicker: { flexDirection: 'row', marginVertical: Spacing.xs },
  staffPill: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  staffPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  staffPillText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  staffPillTextActive: { color: '#fff' },
  addDateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addDateBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
  closedDateRow: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closedDateText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  closedReasonText: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  delBtn: { padding: Spacing.xs },
  delBtnText: { color: Colors.danger, fontSize: Typography.xs, fontWeight: Typography.bold },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted },
});
