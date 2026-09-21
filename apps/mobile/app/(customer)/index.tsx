// Customer home — placeholder until Phase 4 (shop discovery)
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '@/constants/colors';

export default function CustomerHome() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>✂️</Text>
        <Text style={styles.title}>BarberQ</Text>
        <Text style={styles.subtitle}>
          Shop discovery coming in Phase 4.{'\n'}Database and auth are live ✅
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  emoji: { fontSize: 56 },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
