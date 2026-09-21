// Profile tab placeholder — built in Phase 6
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius } from '@/constants/colors';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name ?? '—'}</Text>
        <Text style={styles.phone}>{user?.phone ?? ''}</Text>
        <Text style={styles.role}>Role: {user?.role ?? '—'}</Text>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: Typography.xxxl, fontWeight: Typography.bold, color: '#fff' },
  name: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  phone: { fontSize: Typography.base, color: Colors.textSecondary },
  role: { fontSize: Typography.sm, color: Colors.textMuted },
  signOutBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.danger,
  },
  signOutText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.base },
});
