// ============================================================
// BarberQ — Root layout
// Initializes auth, shows splash while loading,
// then routes to the correct experience by role.
// ============================================================

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

function AuthGuard() {
  const { session, user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not logged in → send to auth screens
      if (!inAuthGroup) router.replace('/(auth)/welcome');
      return;
    }

    if (!user) {
      // Logged in but no profile yet → send to profile setup
      router.replace('/(auth)/profile-setup');
      return;
    }

    // Route by role
    if (!inAuthGroup) return; // Already in the right section

    switch (user.role) {
      case 'customer':
        router.replace('/(customer)');
        break;
      case 'shopkeeper':
        router.replace('/(shopkeeper)/dashboard');
        break;
      case 'admin':
        router.replace('/(admin)');
        break;
    }
  }, [session, user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthGuard />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
