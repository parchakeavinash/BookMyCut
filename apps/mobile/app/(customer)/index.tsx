// ============================================================
// BarberQ — Customer Discovery Home Screen
// Browse nearby shops, search by query, filter by city/service.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Image, RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDiscovery, ShopWithDetails } from '@/hooks/useDiscovery';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const CITIES = ['All', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad'];
const CATEGORIES = ['All', 'haircut', 'beard', 'packages', 'facial', 'kids'];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { unreadCount } = useNotifications();
  const {
    shops,
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    refreshShops,
  } = useDiscovery();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshShops();
    setRefreshing(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All');
    setSelectedCategory('All');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.full_name ? user.full_name.split(' ')[0] : 'Guest'} 👋
          </Text>
          <Text style={styles.brandTitle}>Find your next haircut</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/notifications' as any)}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>✂️</Text>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by salon name, haircut, beard..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* City Filters */}
      <View style={styles.filterSection}>
        <FlatList
          data={CITIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => `city-${c}`}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cityPill, selectedCity === item && styles.cityPillActive]}
              onPress={() => setSelectedCity(item)}
            >
              <Text style={[styles.cityPillText, selectedCity === item && styles.cityPillTextActive]}>
                📍 {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Service Category Pills */}
      <View style={styles.categorySection}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(cat) => `cat-${cat}`}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catPill, selectedCategory === item && styles.catPillActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.catPillText, selectedCategory === item && styles.catPillTextActive]}>
                {item === 'All' ? 'All Services' : item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Shops List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Finding nearby barbers...</Text>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listCountText}>
                {shops.length} {shops.length === 1 ? 'barbershop' : 'barbershops'} available
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💈</Text>
              <Text style={styles.emptyTitle}>No barbershops found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query, city, or service filter.
              </Text>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <Text style={styles.resetBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <ShopCard shop={item} onPress={() => router.push(`/(customer)/shop/${item.id}` as any)} />}
        />
      )}
    </SafeAreaView>
  );
}

function ShopCard({ shop, onPress }: { shop: ShopWithDetails; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Cover Image */}
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: shop.cover_image || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80' }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {shop.rating_avg > 0 ? shop.rating_avg.toFixed(1) : 'New'}</Text>
          {shop.review_count > 0 && (
            <Text style={styles.reviewCountText}>({shop.review_count})</Text>
          )}
        </View>
        {/* Verified Badge */}
        {shop.is_verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.cardBody}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <Text style={styles.priceTag}>from ₹{shop.min_price}</Text>
        </View>

        <Text style={styles.locationText} numberOfLines={1}>
          📍 {shop.area ? `${shop.area}, ` : ''}{shop.city}
        </Text>

        {shop.description && (
          <Text style={styles.descText} numberOfLines={2}>{shop.description}</Text>
        )}

        {/* Footer Meta */}
        <View style={styles.cardFooter}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>⏱ {shop.slot_step_mins}m slots</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>✂️ {shop.services_count ?? 3} services</Text>
          </View>
          <View style={styles.bookActionBtn}>
            <Text style={styles.bookActionText}>View Slots →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  brandTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Shadow.sm,
  },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeText: { fontSize: 22 },
  searchContainer: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  searchBox: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  clearBtn: { padding: 4 },
  clearText: { color: Colors.textMuted, fontSize: Typography.sm, fontWeight: Typography.bold },
  filterSection: { marginTop: Spacing.sm },
  categorySection: { marginTop: Spacing.xs, marginBottom: Spacing.xs },
  filterList: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  cityPill: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cityPillText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  cityPillTextActive: { color: '#fff', fontWeight: Typography.bold },
  catPill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  catPillActive: { backgroundColor: '#EEF2FF' },
  catPillText: { fontSize: 11, color: Colors.textMuted, fontWeight: Typography.medium },
  catPillTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  listContent: { padding: Spacing.lg, paddingTop: Spacing.xs, gap: Spacing.md, paddingBottom: 60 },
  listHeader: { marginBottom: Spacing.xs },
  listCountText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardImageContainer: { height: 160, width: '100%', position: 'relative', backgroundColor: Colors.border },
  cardImage: { width: '100%', height: '100%' },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: { color: '#FBBF24', fontSize: 11, fontWeight: Typography.bold },
  reviewCountText: { color: '#CBD5E1', fontSize: 10 },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  verifiedBadgeText: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },
  cardBody: { padding: Spacing.md, gap: Spacing.xs },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, flex: 1 },
  priceTag: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.success, marginLeft: Spacing.sm },
  locationText: { fontSize: Typography.sm, color: Colors.textSecondary },
  descText: { fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 16 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
  },
  metaPill: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  metaPillText: { fontSize: 11, color: Colors.textSecondary, fontWeight: Typography.medium },
  bookActionBtn: { marginLeft: 'auto' },
  bookActionText: { color: Colors.accent, fontSize: Typography.xs, fontWeight: Typography.bold },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
  resetBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  resetBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
});
