// Shopkeeper dashboard placeholder — built fully in Phase 7
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius } from '@/constants/colors';

export default function ShopkeeperDashboard() {
  const { user, signOut } = useAuthStore();
  const handleSignOut = async () => { await supabase.auth.signOut(); signOut(); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning 👋</Text>
        <Text style={styles.name}>{user?.full_name ?? 'Shopkeeper'}</Text>
        <Text style={styles.sub}>Dashboard coming in Phase 7</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { flex: 1, padding: Spacing.lg, gap: Spacing.sm, justifyContent: 'center' },
  greeting: { fontSize: Typography.base, color: '#94A3B8' },
  name: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: '#FFFFFF' },
  sub: { fontSize: Typography.base, color: '#64748B' },
  signOutBtn: {
    marginTop: Spacing.lg, alignSelf: 'flex-start',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md, backgroundColor: Colors.danger,
  },
  signOutText: { color: '#fff', fontWeight: Typography.semibold },
});
