import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { useAuth } from "@/src/ctx/auth";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "U"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} testID="profile-name">{user?.name}</Text>
            <Text style={styles.email} testID="profile-email">{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>RoopCraft OS</Text>
          <Text style={styles.aboutBody}>
            Research. Strategize. Pitch. Win. An AI-powered platform for creative agencies
            to research local businesses, generate growth strategies, and produce
            client-ready sales kits and proposals.
          </Text>
        </View>

        <TouchableOpacity
          testID="profile-signout-button"
          style={styles.signout}
          activeOpacity={0.85}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  title: {
    fontSize: 28, fontWeight: t.weights.bold, color: colors.onSurface,
    marginTop: spacing.lg, letterSpacing: -0.8,
  },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg,
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.onSurface, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.onSurfaceInverse, fontWeight: t.weights.bold, fontSize: t.sizes.xl },
  name: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface },
  email: { fontSize: t.sizes.base, color: colors.muted, marginTop: 2 },
  sectionLabel: {
    fontSize: t.sizes.sm, fontWeight: t.weights.semibold, color: colors.muted,
    letterSpacing: 0.6, marginTop: spacing.xxl, marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  aboutCard: {
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  aboutTitle: { fontSize: t.sizes.lg, fontWeight: t.weights.bold, color: colors.onSurface },
  aboutBody: { fontSize: t.sizes.base, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 22 },
  signout: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.xxl, paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signoutText: { color: colors.error, fontSize: t.sizes.base, fontWeight: t.weights.semibold },
});
