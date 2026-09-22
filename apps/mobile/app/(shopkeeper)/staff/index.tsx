// ============================================================
// BarberQ — Shopkeeper Staff / Barber Management Screen
// CRUD for barbers + service mapping (staff_services).
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, Switch, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShopkeeper } from '@/hooks/useShopkeeper';
import { Staff } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function StaffScreen() {
  const { staff, services, isLoading, addStaff, updateStaff, deleteStaff, shop } = useShopkeeper();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setBio('Senior Hair Stylist');
    setAvatarUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80');
    // Default to all active services
    setSelectedServiceIds(services.filter((s) => s.is_active).map((s) => s.id));
    setModalVisible(true);
  };

  const openEditModal = (member: Staff) => {
    setEditingStaff(member);
    setName(member.name);
    setPhone(member.phone || '');
    setBio(member.bio || '');
    setAvatarUrl(member.avatar_url || '');
    // Existing service mapping from joined staff_services
    const existingSrvIds = member.staff_services?.map((ss) => ss.service_id) ?? [];
    setSelectedServiceIds(existingSrvIds);
    setModalVisible(true);
  };

  const toggleServiceSelection = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== serviceId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Barber name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingStaff) {
        await updateStaff(
          editingStaff.id,
          {
            name: name.trim(),
            phone: phone.trim() || null,
            bio: bio.trim() || null,
            avatar_url: avatarUrl.trim() || null,
          },
          selectedServiceIds
        );
      } else {
        await addStaff({
          name: name.trim(),
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          service_ids: selectedServiceIds,
        });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member: Staff) => {
    Alert.alert(
      'Remove Barber',
      `Are you sure you want to deactivate "${member.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaff(member.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove staff.');
            }
          },
        },
      ]
    );
  };

  const toggleActive = async (member: Staff) => {
    try {
      await updateStaff(member.id, { is_active: !member.is_active });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Barbers & Stylists</Text>
          <Text style={styles.subtitle}>{shop?.name ?? 'Manage salon team'}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Barber</Text>
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No barbers added yet</Text>
              <Text style={styles.emptySub}>Add stylists to enable customer appointments.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const memberServiceIds = item.staff_services?.map((ss) => ss.service_id) ?? [];
            const memberServices = services.filter((s) => memberServiceIds.includes(s.id));

            return (
              <View style={[styles.staffCard, !item.is_active && styles.cardInactive]}>
                <Image
                  source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' }}
                  style={styles.avatar}
                />

                <View style={styles.staffInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleActive(item)}
                      trackColor={{ true: Colors.accent, false: Colors.border }}
                    />
                  </View>

                  {item.bio && <Text style={styles.staffBio}>{item.bio}</Text>}
                  {item.phone && <Text style={styles.staffPhone}>📞 {item.phone}</Text>}

                  {/* Services badges */}
                  <View style={styles.servicesBadgeRow}>
                    {memberServices.length > 0 ? (
                      memberServices.slice(0, 3).map((srv) => (
                        <View key={srv.id} style={styles.serviceBadge}>
                          <Text style={styles.serviceBadgeText}>{srv.name}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noServiceText}>No services assigned</Text>
                    )}
                    {memberServices.length > 3 && (
                      <View style={styles.serviceBadge}>
                        <Text style={styles.serviceBadgeText}>+{memberServices.length - 3} more</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit Details & Services</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
                      <Text style={styles.delBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Barber' : 'Add New Barber'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.inputLabel}>Role / Specialty</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Master Stylist, Beard Specialist"
                    placeholderTextColor={Colors.textMuted}
                    value={bio}
                    onChangeText={setBio}
                  />

                  <Text style={styles.inputLabel}>Avatar Photo URL</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="https://..."
                    placeholderTextColor={Colors.textMuted}
                    value={avatarUrl}
                    onChangeText={setAvatarUrl}
                  />

                  {/* Service assignment checklist */}
                  <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>
                    Services this barber can perform ({selectedServiceIds.length} selected):
                  </Text>
                  <View style={styles.serviceChecklist}>
                    {services.map((srv) => {
                      const isSelected = selectedServiceIds.includes(srv.id);
                      return (
                        <TouchableOpacity
                          key={srv.id}
                          style={[styles.checkItem, isSelected && styles.checkItemSelected]}
                          onPress={() => toggleServiceSelection(srv.id)}
                        >
                          <Text style={[styles.checkItemText, isSelected && styles.checkItemTextSelected]}>
                            {isSelected ? '✓ ' : '+ '} {srv.name} (₹{srv.price})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {editingStaff ? 'Save Changes' : 'Add Barber'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              }
            />
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
  listContainer: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted },
  staffCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  cardInactive: { opacity: 0.6, backgroundColor: Colors.surfaceMuted },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.border },
  staffInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  staffBio: { fontSize: Typography.xs, color: Colors.textSecondary },
  staffPhone: { fontSize: Typography.xs, color: Colors.textMuted },
  servicesBadgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  serviceBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
  },
  serviceBadgeText: { fontSize: 10, color: Colors.accent, fontWeight: Typography.medium },
  noServiceText: { fontSize: 10, color: Colors.danger },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  editBtn: { paddingVertical: 2 },
  editBtnText: { color: Colors.accent, fontSize: Typography.xs, fontWeight: Typography.semibold },
  delBtn: { paddingVertical: 2 },
  delBtnText: { color: Colors.danger, fontSize: Typography.xs, fontWeight: Typography.semibold },
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
  modalBody: { gap: Spacing.sm, paddingBottom: 30 },
  inputLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  modalInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  serviceChecklist: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginVertical: 4 },
  checkItem: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  checkItemSelected: { backgroundColor: '#DCFCE7', borderColor: Colors.success },
  checkItemText: { fontSize: 11, color: Colors.textSecondary },
  checkItemTextSelected: { color: Colors.statusConfirmedText, fontWeight: Typography.bold },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});
