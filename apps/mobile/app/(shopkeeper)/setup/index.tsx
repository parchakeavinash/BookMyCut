// ============================================================
// BarberQ — Shopkeeper Setup Wizard (Steps 1–4)
// Step 1: Details | Step 2: Photos | Step 3: Services | Step 4: Hours
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, Platform,
  ActivityIndicator, Alert, Switch, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: string;
  duration_mins: string;
}

interface DayHour {
  day_of_week: number;
  label: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

const DEFAULT_HOURS: DayHour[] = [
  { day_of_week: 1, label: 'Monday',    is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 2, label: 'Tuesday',   is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 3, label: 'Wednesday', is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 4, label: 'Thursday',  is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 5, label: 'Friday',    is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 6, label: 'Saturday',  is_open: true,  open_time: '09:00', close_time: '20:00' },
  { day_of_week: 0, label: 'Sunday',    is_open: true,  open_time: '10:00', close_time: '18:00' },
];

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Classic Haircut', category: 'haircut', price: '150', duration_mins: '30' },
  { id: '2', name: 'Beard Trim & Shape', category: 'beard', price: '80', duration_mins: '15' },
  { id: '3', name: 'Haircut + Beard Combo', category: 'packages', price: '220', duration_mins: '45' },
];

export default function ShopSetupScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [pincode, setPincode] = useState('');
  const [slotStepMins, setSlotStepMins] = useState(30);

  // Step 2: Photos
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80');

  // Step 3: Services
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('100');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceCategory, setNewServiceCategory] = useState('haircut');

  // Step 4: Hours & Breaks
  const [hours, setHours] = useState<DayHour[]>(DEFAULT_HOURS);
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');

  // Next step validation
  const canProceedStep1 = name.trim().length >= 2 && address.trim().length >= 3 && city.trim().length >= 2;
  const canProceedStep2 = photoUrl.trim().length > 0;
  const canProceedStep3 = services.length > 0;

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    const item: ServiceItem = {
      id: Date.now().toString(),
      name: newServiceName.trim(),
      category: newServiceCategory,
      price: newServicePrice.trim() || '100',
      duration_mins: newServiceDuration.trim() || '30',
    };
    setServices([...services, item]);
    setNewServiceName('');
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const toggleDayOpen = (dayIndex: number) => {
    setHours(hours.map((h, i) => i === dayIndex ? { ...h, is_open: !h.is_open } : h));
  };

  // Complete Onboarding
  const handleCompleteSetup = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Insert Shop
      const { data: newShop, error: shopErr } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          area: area.trim() || null,
          city: city.trim(),
          pincode: pincode.trim() || null,
          phone: phone.trim() || null,
          latitude: 19.0760, // Standard default for testing
          longitude: 72.8777,
          slot_step_mins: slotStepMins,
          min_advance_booking_mins: 30,
          max_advance_booking_days: 7,
          cancellation_notice_mins: 60,
          is_active: true,
        })
        .select()
        .single();

      if (shopErr) throw shopErr;
      const shopId = newShop.id;

      // 2. Insert Shop Image
      if (photoUrl.trim()) {
        await supabase.from('shop_images').insert({
          shop_id: shopId,
          storage_path: `preset_${Date.now()}`,
          url: photoUrl.trim(),
          is_cover: true,
          sort_order: 0,
        });
      }

      // 3. Insert Services
      const serviceRows = services.map((s, idx) => ({
        shop_id: shopId,
        name: s.name,
        category: s.category,
        price: parseFloat(s.price) || 100,
        duration_mins: parseInt(s.duration_mins, 10) || 30,
        is_active: true,
        sort_order: idx,
      }));

      const { data: insertedServices, error: srvErr } = await supabase
        .from('services')
        .insert(serviceRows)
        .select();

      if (srvErr) throw srvErr;

      // 4. Insert Default Staff (Shopkeeper themselves as primary barber)
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .insert({
          shop_id: shopId,
          user_id: user.id,
          name: user.full_name || 'Master Barber',
          phone: phone.trim() || null,
          bio: 'Head Barber & Salon Owner',
          is_active: true,
          sort_order: 0,
        })
        .select()
        .single();

      if (staffErr) throw staffErr;

      // Map all services to this staff member
      if (insertedServices && insertedServices.length > 0) {
        const staffSrvRows = insertedServices.map((srv) => ({
          staff_id: staffData.id,
          service_id: srv.id,
        }));
        await supabase.from('staff_services').insert(staffSrvRows);
      }

      // 5. Insert Business Hours (7 days)
      const hoursRows = hours.map((h) => ({
        shop_id: shopId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_open: h.is_open,
      }));
      await supabase.from('business_hours').insert(hoursRows);

      // 6. Insert Lunch Break
      if (breakStart && breakEnd) {
        await supabase.from('business_breaks').insert({
          shop_id: shopId,
          start_time: breakStart,
          end_time: breakEnd,
          label: 'Lunch Break',
        });
      }

      Alert.alert('Success 🎉', 'Your shop has been successfully configured!', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(shopkeeper)/dashboard') },
      ]);
    } catch (err: any) {
      console.error('Setup error:', err);
      Alert.alert('Setup Failed', err.message || 'Could not complete shop setup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Setup</Text>
        <Text style={styles.stepBadge}>Step {currentStep} of 4</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ================= STEP 1: Details ================= */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Basic Shop Information</Text>
            <Text style={styles.stepSub}>Tell customers about your salon/barbershop.</Text>

            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Royal Crown Barbers"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Premium grooming and styling for gentlemen"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Shop Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Shop No. 4, Linking Road"
              placeholderTextColor={Colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Area / Locality</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bandra West"
                  placeholderTextColor={Colors.textMuted}
                  value={area}
                  onChangeText={setArea}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mumbai"
                  placeholderTextColor={Colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            <Text style={styles.label}>Slot Interval (Minutes)</Text>
            <View style={styles.slotOptionRow}>
              {[15, 30, 45, 60].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.slotOption, slotStepMins === mins && styles.slotOptionSelected]}
                  onPress={() => setSlotStepMins(mins)}
                >
                  <Text style={[styles.slotOptionText, slotStepMins === mins && styles.slotOptionTextSelected]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ================= STEP 2: Photos ================= */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Shop Cover Photo</Text>
            <Text style={styles.stepSub}>Add a hero image for your shop profile.</Text>

            <View style={styles.previewCard}>
              <Image source={{ uri: photoUrl }} style={styles.coverPreview} resizeMode="cover" />
            </View>

            <Text style={styles.label}>Cover Image URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={Colors.textMuted}
              value={photoUrl}
              onChangeText={setPhotoUrl}
            />

            <Text style={styles.quickPresetTitle}>Or choose a sample salon preset:</Text>
            <View style={styles.presetRow}>
              {[
                { label: 'Classic Barber', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80' },
                { label: 'Modern Studio', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80' },
                { label: 'Luxury Lounge', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80' },
              ].map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.presetBtn, photoUrl === p.url && styles.presetBtnActive]}
                  onPress={() => setPhotoUrl(p.url)}
                >
                  <Text style={[styles.presetBtnText, photoUrl === p.url && styles.presetBtnTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ================= STEP 3: Services ================= */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Services & Pricing</Text>
            <Text style={styles.stepSub}>Configure the haircuts, beard trims, and grooming options you offer.</Text>

            {/* List */}
            {services.map((srv) => (
              <View key={srv.id} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{srv.name}</Text>
                  <Text style={styles.serviceMeta}>
                    ₹{srv.price} • {srv.duration_mins} mins • {srv.category}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveService(srv.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Quick Add */}
            <View style={styles.addSection}>
              <Text style={styles.label}>Add another service</Text>
              <TextInput
                style={styles.input}
                placeholder="Service name (e.g. Hair Wash & Massage)"
                placeholderTextColor={Colors.textMuted}
                value={newServiceName}
                onChangeText={setNewServiceName}
              />
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Duration (Mins)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    value={newServiceDuration}
                    onChangeText={setNewServiceDuration}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddService}>
                <Text style={styles.addBtnText}>+ Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= STEP 4: Hours & Breaks ================= */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Operating Hours & Breaks</Text>
            <Text style={styles.stepSub}>Set your weekly schedule and daily lunch breaks.</Text>

            {hours.map((h, idx) => (
              <View key={h.day_of_week} style={styles.hourRow}>
                <View style={{ width: 100 }}>
                  <Text style={styles.dayLabel}>{h.label}</Text>
                </View>
                <Switch
                  value={h.is_open}
                  onValueChange={() => toggleDayOpen(idx)}
                  trackColor={{ true: Colors.accent, false: Colors.border }}
                />
                <View style={styles.timeWrap}>
                  <Text style={[styles.timeText, !h.is_open && styles.timeClosed]}>
                    {h.is_open ? `${h.open_time} - ${h.close_time}` : 'Closed'}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.breakCard}>
              <Text style={styles.breakTitle}>☕ Standard Lunch Break</Text>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={breakStart}
                    onChangeText={setBreakStart}
                    placeholder="13:00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={breakEnd}
                    onChangeText={setBreakEnd}
                    placeholder="14:00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentStep(currentStep - 1)}
            disabled={submitting}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < 4 ? (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              ((currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                (currentStep === 3 && !canProceedStep3)) &&
                styles.btnDisabled,
            ]}
            onPress={() => setCurrentStep(currentStep + 1)}
            disabled={
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2) ||
              (currentStep === 3 && !canProceedStep3)
            }
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.finishBtn]}
            onPress={handleCompleteSetup}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>Complete Setup 🚀</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  stepBadge: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.accent },
  progressTrack: { height: 4, backgroundColor: Colors.border, width: '100%' },
  progressFill: { height: 4, backgroundColor: Colors.accent },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  stepContainer: { gap: Spacing.md },
  stepHeading: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  stepSub: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.sm },
  label: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  slotOptionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  slotOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  slotOptionSelected: { borderColor: Colors.accent, backgroundColor: '#EEF2FF' },
  slotOptionText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary },
  slotOptionTextSelected: { color: Colors.accent },
  previewCard: {
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  coverPreview: { width: '100%', height: '100%' },
  quickPresetTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, marginTop: Spacing.sm },
  presetRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  presetBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetBtnActive: { borderColor: Colors.accent, backgroundColor: '#EEF2FF' },
  presetBtnText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  presetBtnTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  serviceName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  serviceMeta: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  removeBtn: { padding: Spacing.sm },
  removeBtnText: { color: Colors.danger, fontSize: Typography.base, fontWeight: Typography.bold },
  addSection: {
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  dayLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  timeWrap: { width: 120, alignItems: 'flex-end' },
  timeText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  timeClosed: { color: Colors.danger },
  breakCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  breakTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
  },
  backBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary },
  nextBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  finishBtn: { backgroundColor: Colors.success },
  btnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: Typography.base, fontWeight: Typography.bold, color: '#fff' },
});
