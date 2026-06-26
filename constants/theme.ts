export const colors = {
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
} as const;

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

export const cardStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  borderRadius: radii.md,
};

export const inputStyle = {
  backgroundColor: colors.surfaceElevated,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  borderRadius: radii.sm,
  color: colors.textPrimary,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm + 4,
  fontSize: 16,
};

export const FREE_TIER_LIMIT = 10;
