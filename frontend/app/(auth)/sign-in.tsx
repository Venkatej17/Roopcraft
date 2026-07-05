import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/ctx/auth";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark} testID="brand-mark">
              <Text style={styles.brandMarkText}>R</Text>
            </View>
            <Text style={styles.brandName}>RoopCraft OS</Text>
          </View>

          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            Research. Strategize. Pitch. Win.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="signin-email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@agency.com"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="signin-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />

            {error ? (
              <Text style={styles.error} testID="signin-error">
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              testID="signin-submit-button"
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="signin-goto-signup"
              onPress={() => router.push("/(auth)/sign-up")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Don&apos;t have an account?</Text>
              <Text style={styles.linkAccent}> Create one</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              An AI-powered platform for client research, pitching, and closing.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  brandRow: {
    flexDirection: "row", alignItems: "center", marginTop: spacing.xl, gap: spacing.md,
  },
  brandMark: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  brandMarkText: {
    color: colors.onBrandPrimary, fontSize: t.sizes.lg, fontWeight: t.weights.bold,
  },
  brandName: {
    fontSize: t.sizes.lg, fontWeight: t.weights.semibold, color: colors.onSurface, letterSpacing: -0.3,
  },
  title: {
    fontSize: 34, fontWeight: t.weights.bold, color: colors.onSurface,
    marginTop: spacing.xxxl, letterSpacing: -1,
  },
  subtitle: {
    fontSize: t.sizes.lg, color: colors.muted, marginTop: spacing.sm,
  },
  form: { marginTop: spacing.xxl },
  label: {
    fontSize: t.sizes.sm, color: colors.onSurface, fontWeight: t.weights.medium,
    marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    fontSize: t.sizes.lg, color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  error: { color: colors.error, marginTop: spacing.md, fontSize: t.sizes.base },
  primaryBtn: {
    marginTop: spacing.xxl, backgroundColor: colors.brand, borderRadius: radius.md,
    height: 52, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
  },
  primaryBtnText: {
    color: colors.onBrandPrimary, fontSize: t.sizes.lg, fontWeight: t.weights.semibold,
  },
  linkRow: {
    marginTop: spacing.xl, flexDirection: "row", justifyContent: "center",
  },
  linkText: { color: colors.muted, fontSize: t.sizes.base },
  linkAccent: { color: colors.brand, fontSize: t.sizes.base, fontWeight: t.weights.semibold },
  footer: { marginTop: "auto", paddingTop: spacing.xxl },
  footerText: { color: colors.muted, fontSize: t.sizes.sm, textAlign: "center" },
});
