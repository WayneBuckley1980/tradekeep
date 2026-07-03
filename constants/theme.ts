export type ThemeColors = {
  iconBackground: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderFocus: string;
  ctaBackground: string;
  ctaText: string;
  statusPaid: string;
  statusUpcoming: string;
  statusWaiting: string;
  statusOverdue: string;
  statusCancelled: string;
};

export const darkColors: ThemeColors = {
  iconBackground: '#000000',
  background: '#2A2A2A',
  surface: '#363636',
  surfaceElevated: '#424242',
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  borderSubtle: 'rgba(255,255,255,0.18)',
  borderFocus: 'rgba(255,255,255,0.35)',
  ctaBackground: '#FFFFFF',
  ctaText: '#2A2A2A',
  statusPaid: '#34C759',
  statusUpcoming: '#0A84FF',
  statusWaiting: '#FF9F0A',
  statusOverdue: '#FF453A',
  statusCancelled: '#8E8E93',
};

export const lightColors: ThemeColors = {
  iconBackground: '#1C1C1E',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#8E8E93',
  borderSubtle: 'rgba(0,0,0,0.12)',
  borderFocus: 'rgba(0,0,0,0.25)',
  ctaBackground: '#1C1C1E',
  ctaText: '#FFFFFF',
  statusPaid: '#34C759',
  statusUpcoming: '#007AFF',
  statusWaiting: '#FF9500',
  statusOverdue: '#FF3B30',
  statusCancelled: '#8E8E93',
};

/** @deprecated Prefer useTheme().colors — kept for unmigrated screens (defaults to dark). */
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '500' as const },
};

export function getCardStyle(themeColors: ThemeColors) {
  return {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.borderSubtle,
    borderRadius: radii.md,
  };
}

export function getInputStyle(themeColors: ThemeColors) {
  return {
    backgroundColor: themeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: themeColors.borderSubtle,
    borderRadius: radii.sm,
    color: themeColors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
  };
}

/** @deprecated Prefer useTheme().cardStyle */
export const cardStyle = getCardStyle(darkColors);

/** @deprecated Prefer useTheme().inputStyle */
export const inputStyle = getInputStyle(darkColors);

export const FREE_TIER_LIMIT = 5;
