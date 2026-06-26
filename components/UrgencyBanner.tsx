import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { followUpLabel, getFollowUpUrgency } from '@/lib/dates';

type UrgencyBannerProps = {
  followUpAt: string | null;
  customerName: string;
};

export function UrgencyBanner({ followUpAt, customerName }: UrgencyBannerProps) {
  const urgency = getFollowUpUrgency(followUpAt);

  if (urgency === 'none' || urgency === 'later') {
    return null;
  }

  return (
    <LinearGradient
      colors={[colors.surfaceElevated, colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <Text style={styles.title}>{followUpLabel(followUpAt)}</Text>
      <Text style={styles.subtitle}>Chase {customerName} before they slip away</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
