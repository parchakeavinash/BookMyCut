// ============================================================
// BarberQ — Shopkeeper Profile & Settings Screen
// Manage shop details, photos gallery, slot intervals, and status.
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function ShopProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuthStore();
  const { shop, images, isLoading, updateShop, deleteShopImage, refreshShop } = useShopkeeper();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [slotStepMins, setSlotStepMins] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // New photo input
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setDescription(shop.description || '');
      setPhone(shop.phone || '');
      setAddress(shop.address);
      setArea(shop.area || '');
      setCity(shop.city);
      setPincode(shop.pincode || '');
      setSlotStepMins(shop.slot_step_mins || 30);
      setIsActive(shop.is_active);
    }
  }, [shop]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Validation Error', 'Shop name, address, and city are required.');
      return;
    }

    setSaving(true);
    try {
      await updateShop({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim(),
        area: area.trim() || null,
        city: city.trim(),
        pincode: pincode.trim() || null,
        slot_step_mins: slotStepMins,
        is_active: isActive,
      });
      Alert.alert('Success', 'Shop details updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update shop.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim() || !shop) return;
    setAddingPhoto(true);
    try {
      const { error } = await supabase.from('shop_images').insert({
        shop_id: shop.id,
        storage_path: `url_${Date.now()}`,
        url: newPhotoUrl.trim(),
        is_cover: images.length === 0,
        sort_order: images.length,
      });

      if (error) throw error;
      setNewPhotoUrl('');
      await refreshShop();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add image.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id: string, path: string) => {
    try {
      await deleteShopImage(id, path);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove photo.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    signOut();
    router.replace('/(auth)/welcome');
  };

  if (isLoading) {
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
          <Text style={styles.title}>Shop Profile</Text>
          <Text style={styles.subtitle}>{user?.full_name ?? 'Owner Settings'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Shop Accepting Bookings</Text>
            <Text style={styles.statusSub}>
              {isActive ? 'Visible to customers for live bookings' : 'Paused — customers cannot book'}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: Colors.success, false: Colors.border }}
          />
        </View>

        {/* Gallery / Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shop Photos</Text>
          <Text style={styles.sectionSub}>Images shown to customers when browsing your shop.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {images.map((img) => (
              <View key={img.id} style={styles.imageThumbnailWrap}>
                <Image source={{ uri: img.url }} style={styles.imageThumbnail} />
                <TouchableOpacity
                  style={styles.deletePhotoBtn}
                  onPress={() => handleDeletePhoto(img.id, img.storage_path)}
                >
                  <Text style={styles.deletePhotoText}>✕</Text>
                </TouchableOpacity>
                {img.is_cover && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.addPhotoRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Paste photo URL (https://...)"
              placeholderTextColor={Colors.textMuted}
              value={newPhotoUrl}
              onChangeText={setNewPhotoUrl}
            />
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} disabled={addingPhoto}>
              <Text style={styles.addPhotoBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>Shop Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Contact Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.label}>Address *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Area / Locality</Text>
              <TextInput style={styles.input} value={area} onChangeText={setArea} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} />
            </View>
          </View>

          <Text style={styles.label}>Pincode</Text>
          <TextInput style={styles.input} value={pincode} onChangeText={setPincode} keyboardType="numeric" />
        </View>

        {/* Booking Rules */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Configuration</Text>
          <Text style={styles.sectionSub}>Slot step interval for appointment times.</Text>

          <View style={styles.slotRow}>
            {[15, 30, 45, 60].map((step) => (
              <TouchableOpacity
                key={step}
                style={[styles.slotPill, slotStepMins === step && styles.slotPillActive]}
                onPress={() => setSlotStepMins(step)}
              >
                <Text style={[styles.slotPillText, slotStepMins === step && styles.slotPillTextActive]}>
                  {step} mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hours & Breaks Shortcut */}
        <TouchableOpacity
          style={styles.hoursShortcutBtn}
          onPress={() => router.push('/(shopkeeper)/hours')}
        >
          <Text style={styles.hoursShortcutBtnText}>🕒 Manage Working Hours & Holidays →</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          )}
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
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  signOutText: { color: Colors.danger, fontWeight: Typography.semibold, fontSize: Typography.xs },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  statusCard: {
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
  statusTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  statusSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  sectionSub: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 4 },
  label: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 64, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  slotRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.xs },
  slotPill: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
  },
  slotPillActive: { borderColor: Colors.accent, backgroundColor: '#EEF2FF' },
  slotPillText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  slotPillTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  galleryScroll: { flexDirection: 'row', marginVertical: Spacing.xs },
  imageThumbnailWrap: { position: 'relative', marginRight: Spacing.sm },
  imageThumbnail: { width: 100, height: 75, borderRadius: Radius.md, backgroundColor: Colors.border },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.accent,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  coverBadgeText: { color: '#fff', fontSize: 9, fontWeight: Typography.bold },
  addPhotoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  addPhotoBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  addPhotoBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold },
  hoursShortcutBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  hoursShortcutBtnText: {
    color: Colors.accent,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
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
});
