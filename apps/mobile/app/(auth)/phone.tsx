// ============================================================
// BarberQ — Email OTP entry screen
// Collects email, sends magic OTP via Supabase Auth.
// Phone OTP will be re-enabled once Twilio is configured.
// ============================================================

import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

export default function PhoneScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendOtp = async () => {
    if (!isValid) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Don't auto-create users — profile setup handles that
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Pass email to OTP screen
    router.push({ pathname: '/(auth)/otp', params: { email: email.trim() } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>✂</Text>
          </View>
          <Text style={styles.title}>What's your email?</Text>
          <Text style={styles.subtitle}>
            We'll send a 6-digit code to verify your identity.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.emailInput}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
          />
          <Text style={styles.hint}>
            💡 Switching to phone OTP soon — Twilio setup in progress
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  backBtnText: {
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: 26,
    color: '#fff',
  },
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
  inputSection: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emailInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.md,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#FFFFFF',
  },
});
