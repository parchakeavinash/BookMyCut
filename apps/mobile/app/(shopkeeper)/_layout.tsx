// ============================================================
// BarberQ — Shopkeeper Tab Layout
// Navigation bar across Dashboard, Services, Staff, Hours, Profile.
// ============================================================

import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { useShopkeeper } from '@/hooks/useShopkeeper';

export default function ShopkeeperLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { shop, isLoading } = useShopkeeper();

  // If shopkeeper has no shop yet and is not currently on /setup, redirect to setup wizard
  useEffect(() => {
    if (!isLoading && !shop) {
      const isAlreadyOnSetup = segments.some((s) => s === 'setup');
      if (!isAlreadyOnSetup) {
        router.replace('/(shopkeeper)/setup/index' as any);
      }
    }
  }, [shop, isLoading, segments]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Queue',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="services/index"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>✂️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="staff/index"
        options={{
          title: 'Staff',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>💈</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="shop-profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>🏬</Text>
          ),
        }}
      />
      {/* Hidden screens (not tabs) */}
      <Tabs.Screen
        name="setup/index"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="hours"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 18, opacity: 0.7 },
  iconActive: { opacity: 1 },
});
