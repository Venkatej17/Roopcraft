import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { Chip, StatusPill } from "@/src/components/ui";
import { useAuth } from "@/src/ctx/auth";
import { api, LeadSummary } from "@/src/api";

const FILTERS = ["All", "New", "Contacted", "Meeting Scheduled", "Proposal Sent", "Won", "Lost"];

export default function LeadsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const l = await api.listLeads(token);
      setLeads(l);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === "All") return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Leads</Text>
        <Text style={styles.subtitle}>{leads.length} total • {filtered.length} shown</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f}
              testID={`leads-filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
              label={f}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={26} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === "All" ? "No leads captured yet" : `No ${filter} leads`}
              </Text>
              <Text style={styles.emptyText}>
                {filter === "All" ? "Start an audit to capture your first lead." : "Try a different filter."}
              </Text>
              {filter === "All" ? (
                <TouchableOpacity
                  testID="leads-empty-cta"
                  style={styles.emptyCta}
                  onPress={() => router.push("/(app)/new-audit")}
                >
                  <Text style={styles.emptyCtaText}>+ New Audit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`lead-row-${item.id}`}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => router.push(`/(app)/lead/${item.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.business_name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.category} • {item.city}, {item.state}
                </Text>
                <View style={{ marginTop: spacing.sm }}>
                  <StatusPill status={item.status} testID={`lead-status-${item.id}`} />
                </View>
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
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  title: { fontSize: 28, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.8 },
  subtitle: { fontSize: t.sizes.sm, color: colors.muted, marginTop: 4 },
  chipScroll: { marginTop: spacing.lg, marginHorizontal: -spacing.xl },
  chipRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingRight: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listPad: { padding: spacing.xl, paddingBottom: 120 },
  row: {
    flexDirection: "row", alignItems: "center",
    padding: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
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
  emptyText: {
    fontSize: t.sizes.base, color: colors.muted, textAlign: "center",
    marginTop: spacing.sm, maxWidth: 260,
  },
  emptyCta: {
    marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: 12,
    backgroundColor: colors.brand, borderRadius: radius.pill,
  },
  emptyCtaText: { color: colors.onBrandPrimary, fontWeight: t.weights.semibold },
});
