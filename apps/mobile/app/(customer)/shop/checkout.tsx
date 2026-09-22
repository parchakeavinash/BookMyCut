// ============================================================
// BarberQ — Booking Checkout & Review Screen
// Confirms appointment details, customer note, and calls create_booking RPC.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useBookingDraftStore } from '@/stores/bookingDraftStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const draft = useBookingDraftStore();

  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { shop, service, staff, selectedSlot, reset } = draft;

  // Validate draft state
  if (!shop || !service || !selectedSlot) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Incomplete booking details.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.backHomeText}>Return to Discovery</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const slotDate = new Date(selectedSlot);
  const formattedTime = slotDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = slotDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleConfirmBooking = async () => {
    if (!user) {
      Alert.alert('Sign in Required', 'Please sign in to complete your appointment booking.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/welcome') },
      ]);
      return;
    }

    setSubmitting(true);

    try {
      // Call create_booking RPC
      const { data: booking, error } = await supabase.rpc('create_booking', {
        p_customer_id: user.id,
        p_shop_id: shop.id,
        p_service_id: service.id,
        p_staff_id: staff?.id || null,
        p_start_time: selectedSlot,
        p_customer_note: customerNote.trim() || null,
      });

      if (error) {
        if (error.message.includes('SLOT_UNAVAILABLE') || error.message.includes('NO_STAFF_AVAILABLE')) {
          Alert.alert(
            'Slot No Longer Available',
            'Someone just booked this time slot. Please choose another available slot.',
            [{ text: 'Choose Another Time', onPress: () => router.back() }]
          );
          return;
        }
        throw error;
      }

      // Clear draft on success
      reset();

      // Navigate to confirmation receipt screen
      router.replace({
        pathname: '/(customer)/shop/confirmation',
        params: {
          bookingId: booking.id,
          shopName: shop.name,
          shopAddress: `${shop.address}, ${shop.city}`,
          serviceName: booking.service_name,
          servicePrice: booking.service_price.toString(),
          staffName: booking.staff_name || 'Assigned Stylist',
          startTime: booking.start_time,
        },
      } as any);
    } catch (err: any) {
      console.error('Booking creation error:', err);
      Alert.alert('Booking Error', err.message || 'Could not confirm appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Salon Card */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Barbershop</Text>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopAddress}>📍 {shop.address}, {shop.city}</Text>
        </View>

        {/* Appointment Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Appointment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Date & Time</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.detailValue}>{formattedTime}</Text>
              <Text style={styles.detailSub}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>✂️ Service</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.detailValue}>{service.name}</Text>
              <Text style={styles.detailSub}>⏱ {service.duration_mins} mins</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💈 Barber</Text>
            <Text style={styles.detailValue}>
              {staff?.name || 'Any Available Stylist'}
            </Text>
          </View>
        </View>

        {/* Customer Note Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Notes for the Barber (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g. Skin fade on sides, trim only on top..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            value={customerNote}
            onChangeText={setCustomerNote}
          />
        </View>

        {/* Bill Summary Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Payment Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{service.price}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Convenience Fee</Text>
            <Text style={[styles.billValue, { color: Colors.success }]}>FREE</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.billRowTotal}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{service.price}</Text>
          </View>

          <View style={styles.paymentMethodCard}>
            <Text style={styles.paymentMethodIcon}>💵</Text>
            <View>
              <Text style={styles.paymentMethodTitle}>Pay at Salon</Text>
              <Text style={styles.paymentMethodSub}>Pay via Cash or UPI after service</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total Amount</Text>
          <Text style={styles.bottomPriceValue}>₹{service.price}</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmBooking}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Booking 🚀</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  errorText: { fontSize: Typography.base, color: Colors.textSecondary },
  backHomeBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  backHomeText: { color: '#fff', fontWeight: Typography.bold },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { fontSize: Typography.lg, color: Colors.textPrimary, fontWeight: Typography.bold },
  headerTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  cardEyebrow: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.semibold, textTransform: 'uppercase' },
  shopName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  shopAddress: { fontSize: Typography.xs, color: Colors.textSecondary },
  sectionHeading: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  detailLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  detailSub: { fontSize: 11, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.surfaceMuted, marginVertical: Spacing.xs },
  noteInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  billValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  billRowTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  totalLabel: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  totalValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.accent },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  paymentMethodIcon: { fontSize: 22 },
  paymentMethodTitle: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  paymentMethodSub: { fontSize: 11, color: Colors.textMuted },
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
  bottomPriceLabel: { fontSize: 10, color: Colors.textMuted },
  bottomPriceValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  confirmBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  confirmBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});
