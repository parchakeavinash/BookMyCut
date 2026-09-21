// Shopkeeper layout — drawer/sidebar on web, tabs on mobile
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function ShopkeeperLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopColor: 'rgba(255,255,255,0.1)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          color: '#94A3B8',
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: () => <></> }} />
      <Tabs.Screen name="calendar"  options={{ title: 'Calendar',  tabBarIcon: () => <></> }} />
      <Tabs.Screen name="services/index" options={{ title: 'Services', tabBarIcon: () => <></> }} />
      <Tabs.Screen name="staff/index"    options={{ title: 'Staff',    tabBarIcon: () => <></> }} />
    </Tabs>
  );
}
