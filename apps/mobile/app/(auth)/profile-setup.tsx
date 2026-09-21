// ============================================================
// BarberQ — Profile setup screen
// Runs once after first OTP login.
// Collects name + role (customer vs shopkeeper),
// creates the user row in the `users` table.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  Alert, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';
import { UserRole } from '@/types';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2;

  const handleSave = async () => {
    if (!isValid || !session?.user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id:        session.user.id,
        phone:     session.user.phone ?? null,
        email:     session.user.email ?? null,
        full_name: name.trim(),
        role,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      // If user row already exists (duplicate session), just fetch it
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (existing) {
          setUser(existing as any);
          return; // auth guard will route
        }
      }
      Alert.alert('Error', error.message);
      return;
    }

    setUser(data as any); // auth guard in _layout.tsx will route by role
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>👋</Text>
          </View>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to get started.
          </Text>
        </View>

        {/* Name input */}
        <View style={styles.field}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
          />
        </View>

        {/* Role picker */}
        <View style={styles.field}>
          <Text style={styles.label}>I want to</Text>
          <View style={styles.roleRow}>
            <RoleCard
              icon="💇"
              title="Book haircuts"
              subtitle="Customer"
              selected={role === 'customer'}
              onPress={() => setRole('customer')}
            />
            <RoleCard
              icon="✂️"
              title="Manage my shop"
              subtitle="Shopkeeper"
              selected={role === 'shopkeeper'}
              onPress={() => setRole('shopkeeper')}
            />
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get started →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({
  icon, title, subtitle, selected, onPress
}: {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.roleIcon}>{icon}</Text>
      <Text style={[styles.roleTitle, selected && styles.roleTextSelected]}>{title}</Text>
      <Text style={[styles.roleSubtitle, selected && styles.roleSubSelected]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoText: { fontSize: 28 },
  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  roleCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: '#EEF2FF', // Indigo 50
  },
  roleIcon: { fontSize: 28 },
  roleTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  roleTextSelected: { color: Colors.accent },
  roleSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  roleSubSelected: { color: Colors.accent },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#FFFFFF',
  },
});
