// ============================================================
// BarberQ — Shop Details Screen
// Displays hero gallery, address, ratings, hours, services, and team.
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getShopDetails } from '@/hooks/useDiscovery';
import { Shop, Service, Staff, BusinessHour, ShopImage } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ShopDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [images, setImages] = useState<ShopImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await getShopDetails(id as string);
      setShop(data.shop);
      setServices(data.services);
      setStaff(data.staff);
      setHours(data.hours);
      setImages(data.images);
      if (data.services.length > 0) {
        setSelectedService(data.services[0]);
      }
    } catch (err: any) {
      console.error('Error loading shop details:', err);
      Alert.alert('Error', 'Failed to load shop details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !shop) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading salon details...</Text>
      </SafeAreaView>
    );
  }

  // Categories extracted from services
  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category || 'General')))];
  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter((s) => (s.category || 'General').toLowerCase() === selectedCategory.toLowerCase());

  // Check today's open hours
  const todayDayIndex = new Date().getDay();
  const todayHour = hours.find((h) => h.day_of_week === todayDayIndex);
  const isTodayOpen = todayHour ? todayHour.is_open : true;
  const todayTimeRange = todayHour && todayHour.is_open
    ? `${todayHour.open_time.slice(0, 5)} - ${todayHour.close_time.slice(0, 5)}`
    : 'Closed today';

  const heroImage = images.length > 0
    ? images[activeImageIndex]?.url || images[0].url
    : 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80';

  const handleStartBooking = (serviceToBook?: Service) => {
    const srv = serviceToBook || selectedService || services[0];
    if (!srv) {
      Alert.alert('Select a service', 'Please select a service first.');
      return;
    }
    router.push({
      pathname: '/(customer)/shop/book',
      params: { shopId: shop.id, serviceId: srv.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Floating Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => router.back()}>
          <Text style={styles.roundBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{shop.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Gallery */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />

          {/* Gallery Thumbnails */}
          {images.length > 1 && (
            <View style={styles.thumbOverlay}>
              {images.map((img, i) => (
                <TouchableOpacity
                  key={img.id}
                  style={[styles.thumbPill, activeImageIndex === i && styles.thumbPillActive]}
                  onPress={() => setActiveImageIndex(i)}
                />
              ))}
            </View>
          )}

          <View style={styles.heroRatingBadge}>
            <Text style={styles.heroRatingText}>
              ★ {shop.rating_avg > 0 ? shop.rating_avg.toFixed(1) : '4.8'}
            </Text>
            <Text style={styles.heroReviewsText}>({shop.review_count || 124} reviews)</Text>
          </View>
        </View>

        {/* Shop Main Details */}
        <View style={styles.mainInfoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.addressText}>
            📍 {shop.address}, {shop.area ? `${shop.area}, ` : ''}{shop.city}
          </Text>

          {shop.phone && (
            <Text style={styles.phoneText}>📞 {shop.phone}</Text>
          )}

          {/* Today's Status Banner */}
          <View style={[styles.statusBanner, !isTodayOpen && styles.statusBannerClosed]}>
            <Text style={styles.statusDot}>{isTodayOpen ? '🟢' : '🔴'}</Text>
            <Text style={styles.statusBannerText}>
              {isTodayOpen ? `Open Today: ${todayTimeRange}` : 'Closed Today'}
            </Text>
            <Text style={styles.statusSlotStep}>({shop.slot_step_mins}m slots)</Text>
          </View>

          {shop.description && (
            <Text style={styles.description}>{shop.description}</Text>
          )}
        </View>

        {/* Staff Team Section */}
        {staff.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meet the Stylists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
              {staff.map((st) => (
                <View key={st.id} style={styles.staffCard}>
                  <Image
                    source={{ uri: st.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' }}
                    style={styles.staffAvatar}
                  />
                  <Text style={styles.staffName} numberOfLines={1}>{st.name}</Text>
                  <Text style={styles.staffBio} numberOfLines={1}>{st.bio || 'Stylist'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Services Menu Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services Menu</Text>
            <Text style={styles.serviceCount}>{services.length} items</Text>
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.catBtnText, selectedCategory === cat && styles.catBtnTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Services List */}
          <View style={styles.servicesList}>
            {filteredServices.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                  onPress={() => setSelectedService(srv)}
                  activeOpacity={0.88}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.serviceTitle}>{srv.name}</Text>
                    {srv.description && (
                      <Text style={styles.serviceDesc} numberOfLines={2}>{srv.description}</Text>
                    )}
                    <View style={styles.serviceMetaRow}>
                      <Text style={styles.servicePrice}>₹{srv.price}</Text>
                      <Text style={styles.serviceDuration}>⏱ {srv.duration_mins} mins</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.bookBtn, isSelected && styles.bookBtnSelected]}
                    onPress={() => handleStartBooking(srv)}
                  >
                    <Text style={[styles.bookBtnText, isSelected && styles.bookBtnTextSelected]}>
                      {isSelected ? 'Selected' : 'Book'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weekly Hours Table */}
        <View style={[styles.section, styles.hoursSection]}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <View style={styles.hoursTable}>
            {DAYS_MAP.map((dayName, dayIdx) => {
              const h = hours.find((item) => item.day_of_week === dayIdx);
              const isToday = dayIdx === todayDayIndex;
              return (
                <View key={dayIdx} style={[styles.hourRow, isToday && styles.hourRowToday]}>
                  <Text style={[styles.hourDayText, isToday && styles.hourDayToday]}>
                    {dayName} {isToday && '(Today)'}
                  </Text>
                  <Text style={[styles.hourTimeText, isToday && styles.hourDayToday]}>
                    {h && h.is_open ? `${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}` : 'Closed'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarLabel}>Selected Service</Text>
          <Text style={styles.bottomBarService} numberOfLines={1}>
            {selectedService ? `${selectedService.name} (₹${selectedService.price})` : 'Choose a service'}
          </Text>
        </View>
        <TouchableOpacity style={styles.confirmBookingBtn} onPress={() => handleStartBooking()}>
          <Text style={styles.confirmBookingText}>Book Slot →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },
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
  roundBtnText: { fontSize: Typography.lg, color: Colors.textPrimary, fontWeight: Typography.bold },
  topBarTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, maxWidth: 220 },
  scrollContent: { paddingBottom: 120 },
  heroContainer: { height: 220, width: '100%', position: 'relative', backgroundColor: Colors.border },
  heroImage: { width: '100%', height: '100%' },
  thumbOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  thumbPill: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  thumbPillActive: { width: 20, backgroundColor: '#fff' },
  heroRatingBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroRatingText: { color: '#FBBF24', fontSize: Typography.xs, fontWeight: Typography.bold },
  heroReviewsText: { color: '#CBD5E1', fontSize: 10 },
  mainInfoCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  shopName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  verifiedText: { color: Colors.statusConfirmedText, fontSize: 10, fontWeight: Typography.bold },
  addressText: { fontSize: Typography.sm, color: Colors.textSecondary },
  phoneText: { fontSize: Typography.xs, color: Colors.textMuted },
  statusBanner: {
    backgroundColor: '#F0FDF4',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statusBannerClosed: { backgroundColor: '#FEF2F2' },
  statusDot: { fontSize: 10 },
  statusBannerText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: '#166534' },
  statusSlotStep: { fontSize: 10, color: Colors.textMuted },
  description: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 20 },
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  serviceCount: { fontSize: Typography.xs, color: Colors.textMuted },
  staffScroll: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  staffCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    width: 100,
    gap: 4,
    marginRight: Spacing.sm,
    ...Shadow.sm,
  },
  staffAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.border },
  staffName: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
  staffBio: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  catScroll: { flexDirection: 'row', gap: Spacing.xs, marginVertical: Spacing.xs },
  catBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  catBtnTextActive: { color: '#fff', fontWeight: Typography.bold },
  servicesList: { gap: Spacing.sm, marginTop: Spacing.xs },
  serviceItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.sm,
  },
  serviceItemSelected: { borderColor: Colors.accent, backgroundColor: '#FAFAFF' },
  serviceTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  serviceDesc: { fontSize: Typography.xs, color: Colors.textMuted },
  serviceMetaRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginTop: 2 },
  servicePrice: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.success },
  serviceDuration: { fontSize: Typography.xs, color: Colors.textSecondary },
  bookBtn: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  bookBtnSelected: { backgroundColor: Colors.accent },
  bookBtnText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary },
  bookBtnTextSelected: { color: '#fff' },
  hoursSection: { paddingBottom: Spacing.xl },
  hoursTable: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
    ...Shadow.sm,
  },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  hourRowToday: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, borderRadius: Radius.sm },
  hourDayText: { fontSize: Typography.xs, color: Colors.textSecondary },
  hourDayToday: { color: Colors.accent, fontWeight: Typography.bold },
  hourTimeText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textPrimary },
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
  bottomBarService: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  confirmBookingBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  confirmBookingText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});
