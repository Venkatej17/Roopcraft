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

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e: any) {
      setError(e.message || "Sign-up failed");
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="signup-back-button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>

          <Text style={styles.title}>Create your workspace.</Text>
          <Text style={styles.subtitle}>Start winning clients in minutes.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              testID="signup-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="signup-email-input"
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
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />

            {error ? (
              <Text style={styles.error} testID="signup-error">
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              testID="signup-submit-button"
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="signup-goto-signin"
              onPress={() => router.replace("/(auth)/sign-in")}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>Already have an account?</Text>
              <Text style={styles.linkAccent}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, marginTop: spacing.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  title: {
    fontSize: 34, fontWeight: t.weights.bold, color: colors.onSurface,
    marginTop: spacing.xxl, letterSpacing: -1,
  },
  subtitle: { fontSize: t.sizes.lg, color: colors.muted, marginTop: spacing.sm },
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
});
