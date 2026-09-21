// Placeholder — real bookings list built in Phase 6
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '@/constants/colors';

export default function BookingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📋</Text>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Coming in Phase 6.</Text>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 48 },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary },
});
