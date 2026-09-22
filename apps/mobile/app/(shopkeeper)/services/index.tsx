// ============================================================
// BarberQ — Shopkeeper Services Management Screen (CRUD)
// List, Add, Edit, Delete, and Toggle Active status.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { Service } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const CATEGORIES = ['All', 'haircut', 'beard', 'facial', 'packages', 'kids', 'color'];

export default function ServicesScreen() {
  const { services, isLoading, addService, updateService, deleteService, shop } = useShopkeeper();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('haircut');
  const [price, setPrice] = useState('');
  const [durationMins, setDurationMins] = useState('30');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter((s) => s.category?.toLowerCase() === selectedCategory.toLowerCase());

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setCategory('haircut');
    setPrice('150');
    setDurationMins('30');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category || 'haircut');
    setPrice(service.price.toString());
    setDurationMins(service.duration_mins.toString());
    setDescription(service.description || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Service name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    const durationNum = parseInt(durationMins, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price.');
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration in minutes.');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: name.trim(),
          category,
          price: priceNum,
          duration_mins: durationNum,
          description: description.trim() || null,
        });
      } else {
        await addService({
          name: name.trim(),
          category,
          price: priceNum,
          duration_mins: durationNum,
          description: description.trim() || undefined,
        });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Remove Service',
      `Are you sure you want to deactivate "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteService(service.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete service.');
            }
          },
        },
      ]
    );
  };

  const toggleActive = async (service: Service) => {
    try {
      await updateService(service.id, { is_active: !service.is_active });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Services</Text>
          <Text style={styles.subtitle}>{shop?.name ?? 'Manage price menu'}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryWrap}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catPill, selectedCategory === item && styles.catPillActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.catText, selectedCategory === item && styles.catTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Services List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No services found</Text>
              <Text style={styles.emptySub}>Tap "+ Add Service" to add grooming services.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.serviceCard, !item.is_active && styles.cardInactive]}>
              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category || 'general'}</Text>
                  </View>
                </View>
                {item.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>₹{item.price}</Text>
                  <Text style={styles.durationText}>⏱ {item.duration_mins} mins</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Switch
                  value={item.is_active}
                  onValueChange={() => toggleActive(item)}
                  trackColor={{ true: Colors.accent, false: Colors.border }}
                />
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
                  <Text style={styles.delBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Service Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Skin Fade Haircut"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="150"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Duration (mins) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="30"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    value={durationMins}
                    onChangeText={setDurationMins}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.catPickerRow}>
                {['haircut', 'beard', 'facial', 'packages', 'kids'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catPickBtn, category === c && styles.catPickBtnActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catPickText, category === c && styles.catPickTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Includes styling and hair wash"
                placeholderTextColor={Colors.textMuted}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingService ? 'Save Changes' : 'Create Service'}
                  </Text>
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
  addBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  addBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
  categoryWrap: { marginVertical: Spacing.sm },
  categoryList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  catPill: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  catTextActive: { color: '#fff' },
  listContainer: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted },
  serviceCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.sm,
  },
  cardInactive: { opacity: 0.6, backgroundColor: Colors.surfaceMuted },
  cardInfo: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: Typography.semibold, color: Colors.accent },
  cardDesc: { fontSize: Typography.xs, color: Colors.textMuted },
  priceRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 4, alignItems: 'center' },
  priceText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.success },
  durationText: { fontSize: Typography.xs, color: Colors.textSecondary },
  cardActions: { alignItems: 'center', gap: Spacing.sm, marginLeft: Spacing.md },
  editBtn: { paddingVertical: 2, paddingHorizontal: 6 },
  editBtnText: { color: Colors.accent, fontSize: Typography.xs, fontWeight: Typography.semibold },
  delBtn: { padding: 4 },
  delBtnText: { color: Colors.danger, fontSize: Typography.sm, fontWeight: Typography.bold },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  closeModalBtn: { padding: Spacing.sm },
  closeModalText: { fontSize: Typography.lg, color: Colors.textMuted },
  modalBody: { gap: Spacing.sm },
  inputLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  modalInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  catPickerRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginVertical: 4 },
  catPickBtn: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catPickBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catPickText: { fontSize: 11, color: Colors.textSecondary },
  catPickTextActive: { color: '#fff', fontWeight: Typography.bold },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});
