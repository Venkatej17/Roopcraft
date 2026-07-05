import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

export default function AppTabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-audit"
        options={{
          title: "New",
          tabBarIcon: ({ color }) => (
            <View style={{
              width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand,
              alignItems: "center", justifyContent: "center", marginTop: -12,
            }}>
              <Ionicons name="add" size={24} color="#FFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen name="lead/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="lead/[id]/sales-kit" options={{ href: null }} />
      <Tabs.Screen name="lead/[id]/proposal" options={{ href: null }} />
    </Tabs>
  );
}
