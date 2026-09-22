// Customer route group — bottom tab navigator
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@/constants/colors';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: () => <TabIcon icon="🏠" />,
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: 'Bookings',
          tabBarIcon: () => <TabIcon icon="📋" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <TabIcon icon="👤" />,
        }}
      />
      <Tabs.Screen
        name="shop/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="shop/book"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
