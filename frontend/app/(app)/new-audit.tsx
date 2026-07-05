import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, type as t } from "@/src/theme";
import { useAuth } from "@/src/ctx/auth";
import { api } from "@/src/api";

const CATEGORIES = ["Cafe","Restaurant","Hotel","Gym","Salon","Startup","Clinic","Real Estate","Other"];
const MODELS = [
  { key: "gemini", label: "Gemini 3 Pro", subtitle: "Great for research" },
  { key: "claude", label: "Claude Sonnet 4.5", subtitle: "Best for writing" },
  { key: "openai", label: "GPT-5.2", subtitle: "Balanced, latest" },
];

export default function NewAuditScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [usp, setUsp] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [model, setModel] = useState<string>("gemini");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!businessName || !category || !city || !state) {
      setError("Business name, category, city and state are required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const lead = await api.createLead(token!, {
        business_name: businessName,
        category,
        city,
        state,
        instagram_url: instagramUrl,
        website_url: websiteUrl,
        google_maps_url: googleMapsUrl,
        usp,
        goal,
        notes,
        model,
      });
      router.replace(`/(app)/lead/${lead.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to generate report. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>New Business Audit</Text>
            <Text style={styles.subtitle}>Enter a business — our AI does the rest.</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Business basics */}
          <Text style={styles.sectionLabel}>Business</Text>

          <Field label="Business name *" testID="audit-name-input" value={businessName}
            onChangeText={setBusinessName} placeholder="Scava Cafe" />

          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity
            testID="audit-category-picker"
            style={styles.select}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.selectText, !category && { color: colors.muted }]}>
              {category || "Select a category"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="City *" testID="audit-city-input" value={city} onChangeText={setCity} placeholder="Nellore" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="State *" testID="audit-state-input" value={state} onChangeText={setState} placeholder="Andhra Pradesh" />
            </View>
          </View>

          {/* Links */}
          <Text style={styles.sectionLabel}>Links</Text>
          <Field label="Instagram URL" testID="audit-ig-input" value={instagramUrl}
            onChangeText={setInstagramUrl} placeholder="https://instagram.com/…" autoCapitalize="none" />
          <Field label="Website URL" testID="audit-web-input" value={websiteUrl}
            onChangeText={setWebsiteUrl} placeholder="https://…" autoCapitalize="none" />
          <Field label="Google Maps URL" testID="audit-gmaps-input" value={googleMapsUrl}
            onChangeText={setGoogleMapsUrl} placeholder="https://maps.google.com/…" autoCapitalize="none" />

          {/* Context */}
          <Text style={styles.sectionLabel}>Context</Text>
          <Field label="USP" testID="audit-usp-input" value={usp} onChangeText={setUsp}
            placeholder="Highway cafe with pickleball court" multiline />
          <Field label="Goal" testID="audit-goal-input" value={goal} onChangeText={setGoal}
            placeholder="Increase brand recognition" multiline />
          <Field label="Your notes" testID="audit-notes-input" value={notes} onChangeText={setNotes}
            placeholder="Anything the AI should know…" multiline />

          {/* Model */}
          <Text style={styles.sectionLabel}>AI model</Text>
          <View style={styles.modelWrap}>
            {MODELS.map((m) => (
              <TouchableOpacity
                key={m.key}
                testID={`audit-model-${m.key}`}
                style={[styles.modelCard, model === m.key && styles.modelCardActive]}
                onPress={() => setModel(m.key)}
                activeOpacity={0.85}
              >
                <View style={styles.radioOuter}>
                  {model === m.key ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modelTitle}>{m.label}</Text>
                  <Text style={styles.modelSub}>{m.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error} testID="audit-error">{error}</Text> : null}
        </ScrollView>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            testID="audit-generate-button"
            style={[styles.cta, loading && { opacity: 0.8 }]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <>
                <ActivityIndicator color={colors.onBrandPrimary} />
                <Text style={styles.ctaText}>Generating…</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.ctaText}>Generate Intelligence Report</Text>
              </>
            )}
          </TouchableOpacity>
          {loading ? (
            <Text style={styles.ctaHint}>Deep research can take 20–60 seconds…</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Business category</Text>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                testID={`audit-category-option-${c.toLowerCase().replace(/\s+/g, "-")}`}
                style={[
                  styles.modalOption,
                  category === c && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => { setCategory(c); setShowCategoryPicker(false); }}
              >
                <Text style={styles.modalOptionText}>{c}</Text>
                {category === c ? <Ionicons name="checkmark" color={colors.brand} size={18} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// -- Field --
function Field({
  label, value, onChangeText, placeholder, multiline, testID, autoCapitalize,
}: any) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        autoCapitalize={autoCapitalize || "sentences"}
        style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerRow: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  title: { fontSize: 26, fontWeight: t.weights.bold, color: colors.onSurface, letterSpacing: -0.8 },
  subtitle: { fontSize: t.sizes.base, color: colors.muted, marginTop: 4 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 160 },
  sectionLabel: {
    fontSize: t.sizes.sm, fontWeight: t.weights.semibold, color: colors.muted,
    letterSpacing: 0.6, marginTop: spacing.xl, marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  label: {
    fontSize: t.sizes.sm, color: colors.onSurface, fontWeight: t.weights.medium,
    marginTop: spacing.md, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    fontSize: t.sizes.base, color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  select: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, height: 46,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  selectText: { fontSize: t.sizes.base, color: colors.onSurface },
  rowFields: { flexDirection: "row", gap: spacing.md },
  modelWrap: { gap: spacing.sm, marginTop: 4 },
  modelCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  modelCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSecondary },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  modelTitle: { fontSize: t.sizes.base, fontWeight: t.weights.semibold, color: colors.onSurface },
  modelSub: { fontSize: t.sizes.sm, color: colors.muted, marginTop: 2 },
  error: { color: colors.error, marginTop: spacing.lg, fontSize: t.sizes.base },
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
  ctaHint: {
    color: colors.muted, fontSize: t.sizes.sm, textAlign: "center", marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: t.sizes.lg, fontWeight: t.weights.bold, color: colors.onSurface,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  modalOptionText: { fontSize: t.sizes.lg, color: colors.onSurface },
});
