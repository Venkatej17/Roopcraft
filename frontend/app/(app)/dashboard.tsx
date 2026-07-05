import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { StatCard } from "@/src/components/ui";
import { useAuth } from "@/src/ctx/auth";
import { api, DashboardStats, LeadSummary } from "@/src/api";

export default function DashboardScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, l] = await Promise.all([api.dashboardStats(token), api.listLeads(token)]);
      setStats(s);
      setLeads(l);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const first = user?.name?.split(" ")[0] || "there";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hi, {first}.</Text>
            <Text style={styles.subtitle}>Research. Pitch. Win.</Text>
          </View>
          <TouchableOpacity
            testID="dashboard-profile-btn"
            style={styles.avatar}
            onPress={() => router.push("/(app)/profile")}
          >
            <Text style={styles.avatarText}>{first[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {loading && !stats ? (
          <View style={{ paddingVertical: spacing.xxxl, alignItems: "center" }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard
                testID="stat-total-leads"
                label="Total leads"
                value={stats?.total_leads ?? 0}
                hint="All time"
              />
              <StatCard
                testID="stat-meetings"
                label="Meetings"
                value={stats?.meetings_scheduled ?? 0}
                hint="Scheduled"
              />
              <StatCard
                testID="stat-proposals"
                label="Proposals sent"
                value={stats?.proposals_sent ?? 0}
                hint="Sent to clients"
              />
              <StatCard
                testID="stat-active"
                label="Active clients"
                value={stats?.active_clients ?? 0}
                hint="Won deals"
              />
              <StatCard
                testID="stat-win-rate"
                label="Win rate"
                value={`${stats?.win_rate ?? 0}%`}
                hint="Won vs closed"
                accent
                wide
              />
            </View>

            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent leads</Text>
              <TouchableOpacity
                testID="dashboard-view-all"
                onPress={() => router.push("/(app)/leads")}
              >
                <Text style={styles.linkAccent}>View all</Text>
              </TouchableOpacity>
            </View>

            {leads.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="business-outline" size={26} color={colors.muted} />
                </View>
                <Text style={styles.emptyTitle}>Run your first business audit</Text>
                <Text style={styles.emptyText}>
                  Enter a business name — our AI generates a full intelligence report, sales kit, and proposal.
                </Text>
              </View>
            ) : (
              leads.slice(0, 4).map((l) => (
                <TouchableOpacity
                  key={l.id}
                  testID={`dashboard-recent-lead-${l.id}`}
                  style={styles.leadRow}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/(app)/lead/${l.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadName} numberOfLines={1}>{l.business_name}</Text>
                    <Text style={styles.leadSub} numberOfLines={1}>
                      {l.category} • {l.city}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity
          testID="dashboard-new-audit-cta"
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push("/(app)/new-audit")}
        >
          <Ionicons name="add" size={22} color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>New Business Audit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.lg,
  },
  greeting: { fontSize: 30, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -1 },
  subtitle: { fontSize: t.sizes.base, color: colors.muted, marginTop: spacing.xs },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.onSurface,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.onSurfaceInverse, fontWeight: t.weights.bold, fontSize: t.sizes.lg },
  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.md,
    marginTop: spacing.xxl,
  },
  recentHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.xxl, marginBottom: spacing.md,
  },
  recentTitle: { fontSize: t.sizes.xl, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.5 },
  linkAccent: { color: colors.brand, fontWeight: t.weights.semibold, fontSize: t.sizes.base },
  leadRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  leadName: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface },
  leadSub: { fontSize: t.sizes.sm, color: colors.muted, marginTop: 2 },
  empty: {
    alignItems: "center", padding: spacing.xxl,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface },
  emptyText: { fontSize: t.sizes.base, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
  ctaWrap: {
    position: "absolute", left: spacing.xl, right: spacing.xl, bottom: 76,
  },
  cta: {
    height: 56, backgroundColor: colors.brand, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: t.sizes.lg, fontWeight: t.weights.bold },
});
