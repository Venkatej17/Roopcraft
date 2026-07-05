// Reports tab - shows all generated intelligence reports (same as leads list, focused on reports).
import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { useAuth } from "@/src/ctx/auth";
import { api, LeadSummary } from "@/src/api";

export default function ReportsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const l = await api.listLeads(token);
      setLeads(l);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Every audit you&apos;ve generated.</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={26} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyText}>
                Generate your first business intelligence report.
              </Text>
              <TouchableOpacity
                testID="reports-empty-cta"
                style={styles.emptyCta}
                onPress={() => router.push("/(app)/new-audit")}
              >
                <Text style={styles.emptyCtaText}>+ New Audit</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`report-row-${item.id}`}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => router.push(`/(app)/lead/${item.id}`)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.business_name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.category} • {item.city} • {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerBox: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomColor: colors.divider, borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.8 },
  subtitle: { fontSize: t.sizes.sm, color: colors.muted, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listPad: { padding: spacing.xl, paddingBottom: 120 },
  row: {
    flexDirection: "row", alignItems: "center",
    padding: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandSecondary,
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface },
  rowSub: { fontSize: t.sizes.sm, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", padding: spacing.xxxl, marginTop: spacing.xxl },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface },
  emptyText: { fontSize: t.sizes.base, color: colors.muted, textAlign: "center", marginTop: spacing.sm, maxWidth: 260 },
  emptyCta: {
    marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: 12,
    backgroundColor: colors.brand, borderRadius: radius.pill,
  },
  emptyCtaText: { color: colors.onBrandPrimary, fontWeight: t.weights.semibold },
});
