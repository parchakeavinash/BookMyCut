// ============================================================
// BarberQ — Appointment Confirmation & Receipt Screen
// Displays booking reference, arrival checklist, and navigation actions.
// ============================================================

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    shopName?: string;
    shopAddress?: string;
    serviceName?: string;
    servicePrice?: string;
    staffName?: string;
    startTime?: string;
  }>();

  const formattedDate = params.startTime
    ? new Date(params.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    : 'Upcoming';

  const formattedTime = params.startTime
    ? new Date(params.startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const shortCode = params.bookingId ? params.bookingId.slice(0, 8).toUpperCase() : 'BQ-CONF';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkEmoji}>✅</Text>
          </View>
          <Text style={styles.title}>You're Booked!</Text>
          <Text style={styles.subtitle}>
            Your appointment has been confirmed at {params.shopName || 'the salon'}.
          </Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.refLabel}>Booking Reference</Text>
            <Text style={styles.refCode}>#{shortCode}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Salon</Text>
            <Text style={styles.value}>{params.shopName || 'Barbershop'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={[styles.value, { maxWidth: 200, textAlign: 'right' }]}>
              {params.shopAddress || 'Address on file'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{params.serviceName || 'Haircut'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Barber</Text>
            <Text style={styles.value}>{params.staffName || 'Any Available Stylist'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date & Time</Text>
            <Text style={styles.valueHighlight}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Due at Shop</Text>
            <Text style={styles.totalValue}>₹{params.servicePrice || '150'}</Text>
          </View>
        </View>

        {/* Next Steps Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📌 What to keep in mind:</Text>
          <Text style={styles.infoText}>• Arrive 5 minutes before your time slot.</Text>
          <Text style={styles.infoText}>• Zero waiting: show your booking reference on arrival.</Text>
          <Text style={styles.infoText}>• Pay ₹{params.servicePrice || '150'} directly via Cash or UPI.</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(customer)/bookings' as any)}
          >
            <Text style={styles.primaryBtnText}>View in My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(customer)' as any)}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center', paddingBottom: 60 },
  iconContainer: { alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkEmoji: { fontSize: 36 },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  receiptCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold },
  refCode: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.accent },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  label: { fontSize: Typography.sm, color: Colors.textSecondary },
  value: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  valueHighlight: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.accent },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  totalValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.success },
  infoCard: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  infoTitle: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.accent, marginBottom: 2 },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  actions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.sm },
  primaryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  primaryBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.semibold },
});
