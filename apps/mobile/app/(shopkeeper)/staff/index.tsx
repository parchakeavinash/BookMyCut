import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Typography, Spacing } from "@/constants/colors";
export default function PlaceholderScreen({ title = "Staff" }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md }}>
        <Text style={{ fontSize: Typography.xl, fontWeight: "700", color: Colors.textPrimary }}>{title}</Text>
        <Text style={{ fontSize: Typography.base, color: Colors.textMuted }}>Coming in a later phase.</Text>
      </View>
    </SafeAreaView>
  );
}
