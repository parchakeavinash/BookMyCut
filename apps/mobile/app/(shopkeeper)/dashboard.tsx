// ============================================================
// BarberQ — Shopkeeper Dashboard Screen
// Shows shop overview, active stats, and quick shortcuts.
// ============================================================

import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function ShopkeeperDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { shop, services, staff, hours, isLoading } = useShopkeeper();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  const activeServices = services.filter((s) => s.is_active);
  const activeStaff = staff.filter((st) => st.is_active);
  const openDaysCount = hours.filter((h) => h.is_open).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.ownerName}>{user?.full_name ?? 'Shopkeeper'} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => router.push('/(shopkeeper)/shop-profile')}
        >
          <Text style={styles.profileBadgeText}>🏬 {shop?.city ?? 'Settings'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Shop Card */}
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
          <Text style={styles.slotStepInfo}>
            ⏱ Slot Duration: {shop?.slot_step_mins ?? 30} mins
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(shopkeeper)/services')}
          >
            <Text style={styles.statIcon}>✂️</Text>
            <Text style={styles.statNumber}>{activeServices.length}</Text>
            <Text style={styles.statLabel}>Active Services</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(shopkeeper)/staff')}
          >
            <Text style={styles.statIcon}>💈</Text>
            <Text style={styles.statNumber}>{activeStaff.length}</Text>
            <Text style={styles.statLabel}>Stylists On-Duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(shopkeeper)/hours')}
          >
            <Text style={styles.statIcon}>🕒</Text>
            <Text style={styles.statNumber}>{openDaysCount}/7</Text>
            <Text style={styles.statLabel}>Days Open</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Management</Text>

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
              <Text style={styles.shortcutSub}>Add barbers, assign skills & services</Text>
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
              <Text style={styles.shortcutSub}>Configure opening times, lunch breaks, holidays</Text>
            </View>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutRow}
          onPress={() => router.push('/(shopkeeper)/shop-profile')}
        >
          <View style={styles.shortcutLeft}>
            <Text style={styles.shortcutIcon}>🏬</Text>
            <View>
              <Text style={styles.shortcutTitle}>Shop Profile & Photos</Text>
              <Text style={styles.shortcutSub}>Edit details, upload photos, slot intervals</Text>
            </View>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>
      </ScrollView>
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
  slotStepInfo: { fontSize: Typography.xs, color: '#CBD5E1', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
    ...Shadow.sm,
  },
  statIcon: { fontSize: 20 },
  statNumber: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: Spacing.xs },
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
});
