import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { followUpLabel, formatRelativeDate, getFollowUpUrgency } from '@/lib/dates';
import type { Customer } from '@/types/database';

type CustomerRowProps = {
  customer: Customer;
};

export function CustomerRow({ customer }: CustomerRowProps) {
  const urgency = getFollowUpUrgency(customer.follow_up_at);

  return (
    <Pressable onPress={() => router.push(`/customer/${customer.id}`)}>
      <Card style={styles.row}>
        <View style={styles.header}>
          <Text style={styles.name}>{customer.name}</Text>
          {urgency !== 'none' && urgency !== 'later' ? (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, urgency === 'overdue' && styles.badgeUrgent]}>
                {urgency === 'overdue' ? 'Overdue' : urgency === 'today' ? 'Today' : 'This week'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>
          Last visit: {formatRelativeDate(customer.last_appointment)}
        </Text>
        {customer.follow_up_at ? (
          <Text style={styles.meta}>{followUpLabel(customer.follow_up_at)}</Text>
        ) : null}
        {customer.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {customer.notes}
          </Text>
        ) : null}
        {customer.amount_paid != null ? (
          <Text style={styles.amount}>£{Number(customer.amount_paid).toFixed(2)}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badgeUrgent: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  notes: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  amount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
