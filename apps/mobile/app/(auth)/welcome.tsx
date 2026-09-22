// ============================================================
// BarberQ — Welcome screen
// First screen the user sees. Entry point to auth.
// ============================================================

import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Brand section */}
      <View style={styles.brandSection}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>✂</Text>
        </View>
        <Text style={styles.appName}>BarberQ</Text>
        <Text style={styles.tagline}>
          Book your haircut{'\n'}before you leave home.
        </Text>
      </View>

      {/* Value props */}
      <View style={styles.valueProps}>
        <ValueProp icon="📍" text="Discover nearby barbershops" />
        <ValueProp icon="🕐" text="See real-time slot availability" />
        <ValueProp icon="✅" text="Book in seconds. Zero wait." />
      </View>

      {/* CTA buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/phone')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Continue with Email</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing you agree to our{' '}
          <Text style={styles.link}>Terms</Text> &{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

function ValueProp({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropIcon}>{icon}</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.lg,
  },
  logoText: {
    fontSize: 36,
  },
  appName: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.extrabold,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.lg,
    fontWeight: Typography.medium,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 28,
  },
  valueProps: {
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  valuePropIcon: {
    fontSize: 22,
  },
  valuePropText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: '#E2E8F0',
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  primaryButtonText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: Typography.xs,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});
