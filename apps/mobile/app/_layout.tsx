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

    const segs = segments as string[];
    const inAuthGroup      = segs[0] === '(auth)';
    const inCustomerGroup  = segs[0] === '(customer)';
    const inShopkeeperGroup= segs[0] === '(shopkeeper)';
    const inAdminGroup     = segs[0] === '(admin)';

    // Not authenticated at all → welcome screen
    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/welcome');
      return;
    }

    // Authenticated but no profile yet → must complete profile setup
    if (!user) {
      if (segs[1] !== 'profile-setup') {
        router.replace('/(auth)/profile-setup');
      }
      return;
    }

    // Already on the right role group → do nothing
    if (inCustomerGroup && user.role === 'customer') return;
    if (inShopkeeperGroup && user.role === 'shopkeeper') return;
    if (inAdminGroup && user.role === 'admin') return;

    // Route to correct group based on role
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
  }, [session, user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderBrand}>
          <View style={styles.loaderLogo}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        </View>
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
  loaderBrand: {
    alignItems: 'center',
    gap: 16,
  },
  loaderLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
