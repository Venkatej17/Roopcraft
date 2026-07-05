import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { StatusPill } from "@/src/components/ui";
import { useAuth } from "@/src/ctx/auth";
import { api, LeadFull } from "@/src/api";

const STATUSES = ["New","Contacted","Meeting Scheduled","Proposal Sent","Negotiation","Won","Lost"];
const COVER_IMG = "https://images.unsplash.com/photo-1579341560277-4dfaddaf6e98?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBtaW5pbWFsJTIwY2FmZSUyMGV4dGVyaW9yfGVufDB8fHx8MTc4MzE3Nzc0Nnww&ixlib=rb-4.1.0&q=85";

export default function LeadReportView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [lead, setLead] = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const l = await api.getLead(token, id);
      setLead(l);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (status: string) => {
    if (!token || !id) return;
    setUpdatingStatus(true);
    try {
      await api.updateStatus(token, id, status);
      setLead((prev) => (prev ? { ...prev, status } : prev));
    } finally {
      setUpdatingStatus(false);
      setStatusOpen(false);
    }
  };

  if (loading || !lead) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      </SafeAreaView>
    );
  }

  const r = lead.report || {};
  const bs = r.business_summary || {};
  const gm = r.google_maps_analysis || {};
  const ig = r.instagram_audit || {};
  const opps = r.nearby_opportunities || [];
  const comps = r.competitor_analysis || [];
  const gs = r.growth_strategy || {};
  const reels = r.reel_ideas || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        {/* Cover */}
        <View style={styles.cover}>
          <Image source={COVER_IMG} style={styles.coverImg} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
            style={styles.coverScrim}
          />
          <View style={styles.coverTopBar}>
            <TouchableOpacity
              testID="lead-back-button"
              onPress={() => router.back()}
              style={styles.iconBtnGlass}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.coverContent}>
            <Text style={styles.coverCategory}>{lead.category} • {lead.city}, {lead.state}</Text>
            <Text style={styles.coverTitle} numberOfLines={2}>{lead.business_name}</Text>
            <View style={styles.coverPillRow}>
              <TouchableOpacity
                testID="lead-status-picker"
                onPress={() => setStatusOpen(true)}
              >
                <StatusPill status={lead.status} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Business Summary */}
          <Section title="Business Summary" testID="section-summary">
            <KVBlock label="What they do" value={bs.what_they_do} />
            <KVBlock label="Brand positioning" value={bs.brand_positioning} />
            <KVBlock label="Customer experience" value={bs.customer_experience} />
            <KVBlock label="Target audience" value={bs.target_audience_estimated} />
          </Section>

          {/* Google Maps */}
          <Section title="Google Maps Analysis" testID="section-maps">
            <View style={styles.pairRow}>
              <StatBox label="Rating" value={gm.estimated_rating || "—"} />
              <StatBox label="Reviews" value={gm.estimated_reviews || "—"} />
            </View>
            <KVBlock label="Peak hours" value={gm.peak_hours} />
            <BulletList label="Customers Love" items={gm.positive_themes} accent />
            <BulletList label="Needs Improvement" items={gm.common_complaints} />
          </Section>

          {/* Instagram Audit */}
          <Section title="Instagram Audit" testID="section-instagram">
            <KVBlock label="Bio" value={ig.bio_assessment} />
            <KVBlock label="Highlights" value={ig.highlights} />
            <KVBlock label="Posting frequency" value={ig.posting_frequency} />
            <KVBlock label="Reels" value={ig.reels} />
            <KVBlock label="Engagement" value={ig.engagement} />
            <KVBlock label="Visual consistency" value={ig.visual_consistency} />
            <BulletList label="Strengths" items={ig.strengths} accent />
            <BulletList label="Weaknesses" items={ig.weaknesses} />
            <BulletList label="Missed opportunities" items={ig.missed_opportunities} />
            <BulletList label="Quick wins" items={ig.quick_wins} accent />
          </Section>

          {/* Nearby Opportunities */}
          <Section title="Nearby Opportunities" testID="section-nearby">
            {opps.length === 0 ? (
              <Text style={styles.muted}>No opportunities generated.</Text>
            ) : (
              opps.map((o: any, i: number) => (
                <View key={i} style={styles.oppCard}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{o.type}</Text>
                  </View>
                  <Text style={styles.oppTitle}>{o.example}</Text>
                  <Text style={styles.oppDesc}>{o.how_to_target}</Text>
                </View>
              ))
            )}
          </Section>

          {/* Competitors */}
          <Section title="Competitor Analysis" testID="section-competitors">
            {comps.length === 0 ? (
              <Text style={styles.muted}>No competitors generated.</Text>
            ) : (
              comps.map((c: any, i: number) => (
                <View key={i} style={styles.compCard}>
                  <View style={styles.compHeader}>
                    <Text style={styles.compName}>{c.name}</Text>
                    <Text style={styles.compFollowers}>{c.followers}</Text>
                  </View>
                  <KVSmall label="Content" value={c.content_quality} />
                  <KVSmall label="Frequency" value={c.posting_frequency} />
                  <KVSmall label="Hooks" value={c.hooks} />
                  <KVSmall label="Strengths" value={c.strengths} />
                  <KVSmall label="Weaknesses" value={c.weaknesses} />
                </View>
              ))
            )}
          </Section>

          {/* Growth Strategy */}
          <Section title="Growth Strategy" testID="section-strategy">
            <Text style={styles.subLabel}>Target audience</Text>
            <KVBlock label="Primary" value={gs.target_audience?.primary} />
            <KVBlock label="Secondary" value={gs.target_audience?.secondary} />
            <KVBlock label="Future" value={gs.target_audience?.future} />

            <Text style={[styles.subLabel, { marginTop: spacing.lg }]}>Content pillars</Text>
            <View style={styles.chipsRow}>
              {(gs.content_pillars || []).map((p: string, i: number) => (
                <View key={i} style={styles.pillarChip}>
                  <Text style={styles.pillarText}>{p}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.subLabel, { marginTop: spacing.lg }]}>Monthly content mix</Text>
            {(gs.monthly_content_mix || []).map((m: any, i: number) => (
              <View key={i} style={styles.mixRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mixLabel}>{m.pillar}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, m.percent)}%` }]} />
                  </View>
                </View>
                <Text style={styles.mixPct}>{m.percent}%</Text>
              </View>
            ))}
          </Section>

          {/* Reel Ideas */}
          <Section title={`Reel Ideas (${reels.length})`} testID="section-reels">
            {reels.map((r: any, i: number) => (
              <View key={i} style={styles.reelCard}>
                <View style={styles.reelHeader}>
                  <Text style={styles.reelNum}>#{i + 1}</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{r.category}</Text>
                  </View>
                </View>
                <Text style={styles.reelTitle}>{r.title}</Text>
                {r.hook ? <Text style={styles.reelHook}>{`Hook: ${r.hook}`}</Text> : null}
                {r.description ? <Text style={styles.reelDesc}>{r.description}</Text> : null}
              </View>
            ))}
          </Section>
        </View>
      </ScrollView>

      {/* Sticky Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          testID="lead-open-saleskit"
          style={styles.actionSecondary}
          onPress={() => router.push(`/(app)/lead/${lead.id}/sales-kit`)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={colors.onSurface} />
          <Text style={styles.actionSecondaryText}>Sales Kit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="lead-open-proposal"
          style={styles.actionPrimary}
          onPress={() => router.push(`/(app)/lead/${lead.id}/proposal`)}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.actionPrimaryText}>Proposal</Text>
        </TouchableOpacity>
      </View>

      {/* Status modal */}
      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setStatusOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Update status</Text>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                testID={`status-option-${s.toLowerCase().replace(/\s+/g, "-")}`}
                style={[styles.modalOption, lead.status === s && { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setStatus(s)}
                disabled={updatingStatus}
              >
                <Text style={styles.modalOptionText}>{s}</Text>
                {lead.status === s ? <Ionicons name="checkmark" color={colors.brand} size={18} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ----- Little building blocks -----
function Section({ title, children, testID }: any) {
  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

function KVBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.kvBlock}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function KVSmall({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Text style={styles.kvSmall}>
      <Text style={styles.kvSmallLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

function BulletList({ label, items, accent }: { label: string; items?: string[]; accent?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.subLabel}>{label}</Text>
      <View style={styles.chipsRow}>
        {items.map((it, i) => (
          <View
            key={i}
            style={[
              styles.bulletChip,
              accent && { backgroundColor: colors.brandSecondary, borderColor: colors.brandTertiary },
            ]}
          >
            <Text style={[styles.bulletText, accent && { color: colors.onBrandSecondary }]}>{it}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  cover: { position: "relative", height: 260, backgroundColor: colors.onSurface },
  coverImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverTopBar: { position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md, zIndex: 2 },
  iconBtnGlass: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  coverContent: {
    position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.xl,
  },
  coverCategory: { color: "rgba(255,255,255,0.75)", fontSize: t.sizes.sm, fontWeight: t.weights.medium },
  coverTitle: {
    color: "#fff", fontSize: 30, fontWeight: t.weights.bold, letterSpacing: -0.8,
    marginTop: spacing.xs,
  },
  coverPillRow: { flexDirection: "row", marginTop: spacing.md },

  body: { padding: spacing.xl },

  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: t.sizes.xl, fontWeight: t.weights.bold, color: colors.onSurface,
    letterSpacing: -0.4,
  },
  subLabel: {
    fontSize: t.sizes.sm, fontWeight: t.weights.semibold,
    color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6,
    marginTop: spacing.md,
  },
  kvBlock: { marginTop: spacing.md },
  kvLabel: { fontSize: t.sizes.sm, color: colors.muted, fontWeight: t.weights.medium },
  kvValue: { fontSize: t.sizes.base, color: colors.onSurface, marginTop: 4, lineHeight: 22 },
  kvSmall: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },
  kvSmallLabel: { fontWeight: t.weights.semibold, color: colors.onSurface },

  muted: { color: colors.muted, fontSize: t.sizes.base },

  pairRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  statBox: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  statLabel: { fontSize: t.sizes.sm, color: colors.muted, fontWeight: t.weights.medium },
  statValue: { fontSize: t.sizes.xl, color: colors.onSurface, fontWeight: t.weights.bold, marginTop: 4 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  bulletChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  bulletText: { fontSize: t.sizes.sm, color: colors.onSurface, fontWeight: t.weights.medium },
  pillarChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.onSurface,
  },
  pillarText: { fontSize: t.sizes.sm, color: colors.onSurfaceInverse, fontWeight: t.weights.medium },

  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
  },
  tagText: { fontSize: 11, color: colors.onBrandSecondary, fontWeight: t.weights.semibold, letterSpacing: 0.4 },

  oppCard: {
    marginTop: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  oppTitle: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface, marginTop: spacing.xs },
  oppDesc: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },

  compCard: {
    marginTop: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  compHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  compName: { fontSize: t.sizes.base, fontWeight: t.weights.bold, color: colors.onSurface },
  compFollowers: { fontSize: t.sizes.sm, color: colors.muted },

  mixRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  mixLabel: { fontSize: t.sizes.sm, color: colors.onSurface, fontWeight: t.weights.medium },
  barBg: {
    height: 6, borderRadius: 3, backgroundColor: colors.surfaceSecondary, marginTop: 6, overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.brand },
  mixPct: { fontSize: t.sizes.base, fontWeight: t.weights.bold, color: colors.onSurface, width: 44, textAlign: "right" },

  reelCard: {
    marginTop: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  reelHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reelNum: { fontSize: t.sizes.sm, fontWeight: t.weights.bold, color: colors.muted },
  reelTitle: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface, marginTop: spacing.xs },
  reelHook: { fontSize: t.sizes.sm, color: colors.brand, marginTop: 4, fontWeight: t.weights.medium },
  reelDesc: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },

  actionBar: {
    position: "absolute", left: spacing.xl, right: spacing.xl, bottom: 76,
    flexDirection: "row", gap: spacing.md,
  },
  actionSecondary: {
    flex: 1, height: 52, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
  },
  actionSecondaryText: { color: colors.onSurface, fontWeight: t.weights.semibold, fontSize: t.sizes.base },
  actionPrimary: {
    flex: 1, height: 52, borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  actionPrimaryText: { color: colors.onBrandPrimary, fontWeight: t.weights.bold, fontSize: t.sizes.base },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: spacing.xxxl,
  },
  modalTitle: { fontSize: t.sizes.lg, fontWeight: t.weights.bold, color: colors.onSurface, marginBottom: spacing.md },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  modalOptionText: { fontSize: t.sizes.lg, color: colors.onSurface },
});
