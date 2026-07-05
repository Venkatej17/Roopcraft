import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { useAuth } from "@/src/ctx/auth";
import { api, LeadFull } from "@/src/api";

export default function ProposalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [lead, setLead] = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const l = await api.getLead(token, id);
      setLead(l);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generate = async () => {
    if (!token || !id) return;
    setGenerating(true);
    try {
      const p = await api.generateProposal(token, id);
      setLead((prev) => (prev ? { ...prev, proposal: p } : prev));
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !lead) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      </SafeAreaView>
    );
  }

  const p = lead.proposal;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity testID="proposal-back" style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>Proposal</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{lead.business_name}</Text>
        </View>
      </View>

      {!p ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Generate Proposal</Text>
          <Text style={styles.emptyText}>
            We&apos;ll draft a full multi-section proposal: cover, audit, opportunities, strategy,
            timeline, pricing, portfolio, and closing.
          </Text>
          <TouchableOpacity
            testID="proposal-generate-btn"
            style={[styles.generateBtn, generating && { opacity: 0.7 }]}
            onPress={generate}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.generateText}>Generate now</Text>
              </>
            )}
          </TouchableOpacity>
          {generating ? <Text style={styles.hint}>Composing the pitch…</Text> : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Cover */}
          <View style={styles.cover}>
            <Text style={styles.coverKicker}>Prepared by</Text>
            <Text style={styles.coverBrand}>RoopCraft</Text>
            <Text style={styles.coverTitle}>{p.cover?.title || `Growth Blueprint for ${lead.business_name}`}</Text>
            <Text style={styles.coverSub}>{p.cover?.subtitle || ""}</Text>
          </View>

          {/* Audit */}
          <PSection number="01" title="Business Audit">
            {p.audit?.summary ? <Text style={styles.body1}>{p.audit.summary}</Text> : null}
            {(p.audit?.key_findings || []).map((k: string, i: number) => (
              <BulletRow key={i} text={k} />
            ))}
          </PSection>

          {/* Opportunities */}
          <PSection number="02" title="Opportunities">
            {p.opportunities?.headline ? <Text style={styles.headline}>{p.opportunities.headline}</Text> : null}
            {(p.opportunities?.items || []).map((it: any, i: number) => (
              <View key={i} style={styles.oppRow}>
                <Text style={styles.oppTitle}>{it.title}</Text>
                <Text style={styles.oppDesc}>{it.description}</Text>
              </View>
            ))}
          </PSection>

          {/* Strategy */}
          <PSection number="03" title="Strategy">
            {p.strategy?.headline ? <Text style={styles.headline}>{p.strategy.headline}</Text> : null}
            {(p.strategy?.pillars || []).map((pl: any, i: number) => (
              <View key={i} style={styles.pillarRow}>
                <Text style={styles.pillarName}>{pl.name}</Text>
                <Text style={styles.pillarDesc}>{pl.description}</Text>
              </View>
            ))}
            {(p.strategy?.deliverables || []).length > 0 ? (
              <>
                <Text style={styles.subLabel}>Deliverables</Text>
                {(p.strategy.deliverables || []).map((d: string, i: number) => (
                  <BulletRow key={i} text={d} />
                ))}
              </>
            ) : null}
          </PSection>

          {/* Timeline */}
          <PSection number="04" title="Timeline">
            {(p.timeline || []).map((m: any, i: number) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineMonthBox}>
                  <Text style={styles.timelineMonth}>{m.month}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineFocus}>{m.focus}</Text>
                  {(m.deliverables || []).map((d: string, j: number) => (
                    <Text key={j} style={styles.timelineItem}>• {d}</Text>
                  ))}
                </View>
              </View>
            ))}
          </PSection>

          {/* Pricing */}
          <PSection number="05" title="Investment" dark>
            <Text style={styles.priceHead}>{p.pricing?.package_name || "Growth Partner"}</Text>
            <Text style={styles.priceAmount}>{p.pricing?.monthly_estimate || "₹XX,XXX / month"}</Text>
            {p.pricing?.note ? <Text style={styles.priceNote}>{p.pricing.note}</Text> : null}
            {(p.pricing?.includes || []).map((d: string, i: number) => (
              <BulletRow key={i} text={d} light />
            ))}
          </PSection>

          {/* Portfolio */}
          <PSection number="06" title="Portfolio">
            {p.portfolio?.note ? <Text style={styles.body1}>{p.portfolio.note}</Text> : null}
            {(p.portfolio?.featured_cases || []).map((c: string, i: number) => (
              <BulletRow key={i} text={c} />
            ))}
          </PSection>

          {/* Closing */}
          <PSection number="07" title="Let's build together">
            <Text style={styles.body1}>{p.closing}</Text>
          </PSection>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PSection({ number, title, children, dark }: any) {
  return (
    <View style={[pStyles.section, dark && pStyles.sectionDark]}>
      <View style={pStyles.header}>
        <Text style={[pStyles.number, dark && { color: colors.brand }]}>{number}</Text>
        <Text style={[pStyles.title, dark && { color: colors.onSurfaceInverse }]}>{title}</Text>
      </View>
      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

function BulletRow({ text, light }: { text: string; light?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, light && { backgroundColor: colors.brand }]} />
      <Text style={[styles.bulletText, light && { color: colors.onSurfaceInverse }]}>{text}</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionDark: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  header: {
    flexDirection: "row", alignItems: "baseline", gap: spacing.md,
  },
  number: { fontSize: t.sizes.sm, fontWeight: t.weights.bold, color: colors.brand, letterSpacing: 1 },
  title: {
    fontSize: t.sizes.xxl, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.6,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
  },
  headerLabel: { fontSize: t.sizes.sm, color: colors.muted, fontWeight: t.weights.medium },
  headerTitle: { fontSize: t.sizes.xl, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.4 },

  body: { padding: spacing.xl, paddingBottom: 60 },

  cover: {
    backgroundColor: colors.onSurface, padding: spacing.xxl, borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  coverKicker: { color: colors.brand, fontWeight: t.weights.bold, letterSpacing: 1, fontSize: t.sizes.sm },
  coverBrand: { color: colors.onSurfaceInverse, fontSize: 30, fontWeight: t.weights.black, letterSpacing: -1 },
  coverTitle: {
    color: colors.onSurfaceInverse, fontSize: t.sizes.xl, fontWeight: t.weights.semibold,
    marginTop: spacing.lg, lineHeight: 30,
  },
  coverSub: { color: "#B5B5B5", fontSize: t.sizes.base, marginTop: spacing.xs },

  body1: { fontSize: t.sizes.base, color: colors.onSurface, lineHeight: 24 },
  headline: { fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface, marginBottom: spacing.sm },

  oppRow: {
    marginTop: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  oppTitle: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface },
  oppDesc: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },

  pillarRow: { marginTop: spacing.md },
  pillarName: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface },
  pillarDesc: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },

  subLabel: {
    fontSize: t.sizes.sm, fontWeight: t.weights.semibold, color: colors.muted,
    textTransform: "uppercase", letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm,
  },

  timelineRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  timelineMonthBox: {
    minWidth: 84, padding: spacing.sm, alignItems: "center", justifyContent: "center",
    borderRadius: radius.sm, backgroundColor: colors.brandSecondary,
  },
  timelineMonth: { color: colors.onBrandSecondary, fontWeight: t.weights.bold, fontSize: t.sizes.sm },
  timelineFocus: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface },
  timelineItem: { fontSize: t.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2, lineHeight: 20 },

  priceHead: { color: "#B5B5B5", fontSize: t.sizes.base, fontWeight: t.weights.semibold, letterSpacing: 0.5, textTransform: "uppercase" },
  priceAmount: { color: colors.onSurfaceInverse, fontSize: 40, fontWeight: t.weights.black, letterSpacing: -1, marginTop: spacing.xs },
  priceNote: { color: "#8A8A8A", fontSize: t.sizes.sm, marginTop: spacing.xs, marginBottom: spacing.md },

  bulletRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginTop: spacing.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, marginTop: 8 },
  bulletText: { flex: 1, fontSize: t.sizes.base, color: colors.onSurface, lineHeight: 22 },

  emptyWrap: {
    padding: spacing.xxl, alignItems: "center", marginTop: spacing.xxl,
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: t.sizes.xl, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.4 },
  emptyText: {
    fontSize: t.sizes.base, color: colors.muted, textAlign: "center",
    marginTop: spacing.sm, maxWidth: 320, lineHeight: 22,
  },
  generateBtn: {
    marginTop: spacing.xl, height: 52, backgroundColor: colors.brand, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
  },
  generateText: { color: colors.onBrandPrimary, fontWeight: t.weights.bold, fontSize: t.sizes.lg },
  hint: { marginTop: spacing.md, color: colors.muted, fontSize: t.sizes.sm },

  bottomPad: { height: 60 },
});
