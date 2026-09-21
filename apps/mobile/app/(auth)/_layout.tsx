// Auth route group layout — no navigation chrome
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
