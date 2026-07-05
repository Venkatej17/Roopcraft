import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { Chip } from "@/src/components/ui";
import { useAuth } from "@/src/ctx/auth";
import { api, LeadFull } from "@/src/api";

const TABS = [
  { key: "cold_call_script", label: "Cold Call" },
  { key: "instagram_dm", label: "Instagram DM" },
  { key: "whatsapp_message", label: "WhatsApp" },
  { key: "meeting_opening", label: "Meeting Opening" },
  { key: "slide_speaker_notes", label: "Slide Notes" },
  { key: "objection_handling", label: "Objections" },
  { key: "closing_script", label: "Closing" },
];

export default function SalesKitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [lead, setLead] = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<string>("cold_call_script");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const l = await api.getLead(token, id);
      setLead(l);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generate = async () => {
    if (!token || !id) return;
    setGenerating(true);
    try {
      const kit = await api.generateSalesKit(token, id);
      setLead((prev) => (prev ? { ...prev, sales_kit: kit } : prev));
    } catch (e) {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading || !lead) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      </SafeAreaView>
    );
  }

  const kit = lead.sales_kit;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity testID="saleskit-back" style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>Sales Kit</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{lead.business_name}</Text>
        </View>
      </View>

      {!kit ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Generate Sales Kit</Text>
          <Text style={styles.emptyText}>
            We&apos;ll generate cold call scripts, Instagram DMs, WhatsApp messages, meeting openers,
            objection handling and closing scripts — all personalized to this business.
          </Text>
          <TouchableOpacity
            testID="saleskit-generate-btn"
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
          {generating ? (
            <Text style={styles.hint}>Writing personalized scripts…</Text>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
            style={styles.tabsScroll}
          >
            {TABS.map((tb) => (
              <Chip
                key={tb.key}
                testID={`saleskit-tab-${tb.key}`}
                label={tb.label}
                active={tab === tb.key}
                onPress={() => setTab(tb.key)}
              />
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.body}>
            {renderTab(tab, kit, copy, copied)}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function renderTab(tab: string, kit: any, copy: (t: string, k: string) => void, copied: string | null) {
  if (tab === "slide_speaker_notes") {
    const notes = kit.slide_speaker_notes || [];
    return (
      <View style={{ gap: spacing.md }}>
        {notes.map((s: any, i: number) => (
          <ScriptCard
            key={i}
            title={s.slide}
            body={s.notes}
            testID={`saleskit-slide-${i}`}
            onCopy={() => copy(s.notes || "", `slide-${i}`)}
            copied={copied === `slide-${i}`}
          />
        ))}
      </View>
    );
  }
  if (tab === "objection_handling") {
    const obs = kit.objection_handling || [];
    return (
      <View style={{ gap: spacing.md }}>
        {obs.map((o: any, i: number) => (
          <ScriptCard
            key={i}
            title={`"${o.objection}"`}
            body={o.response}
            testID={`saleskit-objection-${i}`}
            onCopy={() => copy(o.response || "", `obj-${i}`)}
            copied={copied === `obj-${i}`}
          />
        ))}
      </View>
    );
  }
  const body = kit[tab] || "";
  return (
    <ScriptCard
      title=""
      body={body}
      testID={`saleskit-content-${tab}`}
      onCopy={() => copy(body, tab)}
      copied={copied === tab}
    />
  );
}

function ScriptCard({
  title, body, onCopy, copied, testID,
}: {
  title: string; body: string; onCopy: () => void; copied?: boolean; testID?: string;
}) {
  return (
    <View style={styles.scriptCard} testID={testID}>
      {title ? <Text style={styles.scriptTitle}>{title}</Text> : null}
      <Text style={styles.scriptBody}>{body}</Text>
      <TouchableOpacity
        style={styles.copyBtn}
        onPress={onCopy}
        activeOpacity={0.85}
      >
        <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={colors.onSurface} />
        <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  tabsScroll: { maxHeight: 56, marginTop: spacing.sm },
  tabsRow: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  body: { padding: spacing.xl, paddingBottom: 120 },
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

  scriptCard: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  scriptTitle: {
    fontSize: t.sizes.lg, fontWeight: t.weights.bold, color: colors.onSurface,
    marginBottom: spacing.sm, letterSpacing: -0.2,
  },
  scriptBody: { fontSize: t.sizes.base, color: colors.onSurface, lineHeight: 24 },
  copyBtn: {
    marginTop: spacing.md, alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  copyText: { fontSize: t.sizes.sm, color: colors.onSurface, fontWeight: t.weights.medium },
});
