// ============================================================
// BarberQ — OTP verification screen
// Receives phone from params, verifies 6-digit OTP.
// On success: Supabase session created → auth guard routes user.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/colors';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || loading) return;
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone!,
      token: otp,
      type: 'sms',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Invalid code', 'Please check the code and try again.');
      setOtp('');
      return;
    }

    // Auth state change listener in useAuth hook will handle routing
    // If user profile doesn't exist yet → profile-setup
    // If user profile exists → customer or shopkeeper dashboard
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(RESEND_COOLDOWN);
    setOtp('');

    const { error } = await supabase.auth.signInWithOtp({ phone: phone! });
    if (error) Alert.alert('Error', error.message);
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
            <Text style={styles.logoText}>📱</Text>
          </View>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>
        </View>

        {/* OTP input — single hidden TextInput + visual boxes */}
        <View style={styles.otpSection}>
          <TouchableOpacity
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            <View style={styles.otpBoxRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp.length === i && styles.otpBoxActive,
                    otp[i] && styles.otpBoxFilled,
                  ]}
                >
                  {loading && i === otp.length - 1 ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                  )}
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Hidden input that captures keypresses */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
        </View>

        {/* Resend */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendTimer > 0}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
              {resendTimer > 0
                ? `Resend code in ${resendTimer}s`
                : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BOX_SIZE = 52;

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
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: 28,
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
  phoneHighlight: {
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  otpSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_SIZE + 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  otpBoxActive: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  otpBoxFilled: {
    backgroundColor: Colors.surfaceMuted,
  },
  otpDigit: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  resendText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.accent,
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
});
