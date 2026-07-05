// RoopCraft OS Design Tokens
export const colors = {
  surface: "#FFFFFF",
  onSurface: "#000000",
  surfaceSecondary: "#F7F7F7",
  onSurfaceSecondary: "#111111",
  surfaceTertiary: "#EAEAEA",
  onSurfaceTertiary: "#444444",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FFFFFF",
  brand: "#FF6B00",
  brandPrimary: "#FF6B00",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FFF0E5",
  onBrandSecondary: "#D95B00",
  brandTertiary: "#FFE1CC",
  onBrandTertiary: "#CC5600",
  success: "#0A7A5F",
  warning: "#B77C00",
  error: "#D32F2F",
  info: "#444444",
  border: "#EAEAEA",
  borderStrong: "#CCCCCC",
  divider: "#F2F2F2",
  muted: "#6B6B6B",
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const radius = {
  sm: 6, md: 12, lg: 16, pill: 999,
};

export const type = {
  displayFamily: undefined, // rely on system font (San Francisco / Roboto) for premium native feel
  textFamily: undefined,
  sizes: { xs: 11, sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    black: "800" as const,
  },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
};
