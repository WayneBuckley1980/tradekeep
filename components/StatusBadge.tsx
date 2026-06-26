import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  paid: colors.statusPaid,
  completed: colors.statusPaid,
  upcoming: colors.statusUpcoming,
  sent: colors.statusUpcoming,
  in_progress: colors.statusUpcoming,
  waiting: colors.statusWaiting,
  draft: colors.statusWaiting,
  overdue: colors.statusOverdue,
  rejected: colors.statusOverdue,
  cancelled: colors.statusCancelled,
  expired: colors.statusCancelled,
};

type StatusBadgeProps = {
  label: string;
  status?: string;
};

export function StatusBadge({ label, status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status ?? label.toLowerCase()] ?? colors.textSecondary;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
