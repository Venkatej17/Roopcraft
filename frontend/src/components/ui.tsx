import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, type as t, shadow } from "@/src/theme";

// ---------- ScreenHeader ----------
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={h.wrap}>
      <View style={h.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={h.backBtn} testID="header-back-button">
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ flex: 1 }} />
        {right ?? <View style={{ width: 40 }} />}
      </View>
      <Text style={h.title}>{title}</Text>
      {subtitle ? <Text style={h.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const h = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 28, fontWeight: t.weights.bold, color: colors.onSurface,
    marginTop: spacing.md, letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: t.sizes.base, color: colors.muted, marginTop: spacing.xs,
  },
});

// ---------- StatCard ----------
export function StatCard({
  label,
  value,
  hint,
  wide = false,
  accent = false,
  testID,
}: {
  label: string;
  value: string | number;
  hint?: string;
  wide?: boolean;
  accent?: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        s.card,
        wide && { flexBasis: "100%" },
        accent && { backgroundColor: colors.onSurface },
      ]}
    >
      <Text style={[s.label, accent && { color: "#B5B5B5" }]}>{label}</Text>
      <Text style={[s.value, accent && { color: colors.onSurfaceInverse }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[s.hint, accent && { color: "#B5B5B5" }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: t.sizes.sm, color: colors.muted, fontWeight: t.weights.medium,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 28, color: colors.onSurface, fontWeight: t.weights.bold,
    marginTop: spacing.sm, letterSpacing: -0.8,
  },
  hint: {
    fontSize: t.sizes.sm, color: colors.muted, marginTop: spacing.xs,
  },
});

// ---------- Chip ----------
export function Chip({
  label, active, onPress, testID,
}: {
  label: string; active?: boolean; onPress?: () => void; testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[c.chip, active && c.chipActive]}
    >
      <Text style={[c.label, active && c.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  chip: {
    height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: {
    borderColor: colors.onSurface, backgroundColor: colors.onSurface,
  },
  label: { fontSize: t.sizes.base, color: colors.onSurface, fontWeight: t.weights.medium },
  labelActive: { color: colors.onSurfaceInverse },
});

// ---------- SectionCard ----------
export function SectionCard({
  title, children, right,
}: {
  title: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.title}>{title}</Text>
        {right}
      </View>
      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  title: {
    fontSize: t.sizes.lg, fontWeight: t.weights.bold, color: colors.onSurface,
    letterSpacing: -0.3,
  },
});

// ---------- StatusPill ----------
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  "New": { bg: colors.surfaceSecondary, fg: colors.onSurface },
  "Contacted": { bg: "#EEF6FF", fg: "#0055CC" },
  "Meeting Scheduled": { bg: "#FFF6E8", fg: "#8A5A00" },
  "Proposal Sent": { bg: "#F1EBFF", fg: "#5533B8" },
  "Negotiation": { bg: colors.brandSecondary, fg: colors.onBrandSecondary },
  "Won": { bg: "#E6F6EF", fg: colors.success },
  "Lost": { bg: "#FDECEC", fg: colors.error },
};

export function StatusPill({ status, testID }: { status: string; testID?: string }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.New;
  return (
    <View testID={testID} style={[p.pill, { backgroundColor: cfg.bg }]}>
      <View style={[p.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[p.text, { color: cfg.fg }]}>{status}</Text>
    </View>
  );
}

const p = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.pill, alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: t.sizes.sm, fontWeight: t.weights.semibold },
});

// ---------- Primary Button ----------
export function PrimaryButton({
  label, onPress, loading, icon, testID, dark,
}: {
  label: string; onPress: () => void; loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap; testID?: string; dark?: boolean;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[
        b.btn,
        dark ? { backgroundColor: colors.onSurface } : { backgroundColor: colors.brand },
        loading && { opacity: 0.7 },
      ]}
    >
      <Text style={b.txt}>{loading ? "Working…" : label}</Text>
      {icon && !loading ? <Ionicons name={icon} size={18} color={colors.onBrandPrimary} /> : null}
    </TouchableOpacity>
  );
}

const b = StyleSheet.create({
  btn: {
    height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg,
  },
  txt: { color: "#FFF", fontSize: t.sizes.lg, fontWeight: t.weights.semibold },
});
