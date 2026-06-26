import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { followUpLabel, formatRelativeDate, getFollowUpUrgency } from '@/lib/dates';
import type { Customer } from '@/types/database';

type CustomerRowProps = {
  customer: Customer;
  balanceOwing?: number;
};

export function CustomerRow({ customer, balanceOwing }: CustomerRowProps) {
  const urgency = getFollowUpUrgency(customer.follow_up_at);

  return (
    <Pressable onPress={() => router.push(`/customer/${customer.id}`)}>
      <Card style={styles.row}>
        <View style={styles.header}>
          <Text style={styles.name}>{customer.is_favourite ? `⭐ ${customer.name}` : customer.name}</Text>
          {urgency !== 'none' && urgency !== 'later' ? (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, urgency === 'overdue' && styles.badgeUrgent]}>
                {urgency === 'overdue' ? 'Overdue' : urgency === 'today' ? 'Today' : 'This week'}
              </Text>
            </View>
          ) : null}
        </View>
        {customer.phone ? <Text style={styles.meta}>{customer.phone}</Text> : null}
        {customer.next_action ? <Text style={styles.nextAction}>→ {customer.next_action}</Text> : null}
        <Text style={styles.meta}>Last visit: {formatRelativeDate(customer.last_appointment)}</Text>
        {customer.follow_up_at ? <Text style={styles.meta}>{followUpLabel(customer.follow_up_at)}</Text> : null}
        {customer.notes ? <Text style={styles.notes} numberOfLines={1}>{customer.notes}</Text> : null}
        {balanceOwing != null && balanceOwing > 0 ? (
          <Text style={styles.owing}>£{balanceOwing.toFixed(2)} owing</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

export function ContactActions({ customer }: { customer: Customer }) {
  const call = () => customer.phone && Linking.openURL(`tel:${customer.phone}`);
  const text = () => customer.phone && Linking.openURL(`sms:${customer.phone}`);
  const email = () => customer.email && Linking.openURL(`mailto:${customer.email}`);

  if (!customer.phone && !customer.email) return null;

  return (
    <View style={styles.actions}>
      {customer.phone ? (
        <>
          <Pressable style={styles.actionBtn} onPress={call}><Text style={styles.actionText}>Call</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={text}><Text style={styles.actionText}>Text</Text></Pressable>
        </>
      ) : null}
      {customer.email ? (
        <Pressable style={styles.actionBtn} onPress={email}><Text style={styles.actionText}>Email</Text></Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.heading, color: colors.textPrimary, flex: 1, fontSize: 18 },
  badge: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { ...typography.caption, color: colors.textSecondary },
  badgeUrgent: { color: colors.textPrimary, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  nextAction: { ...typography.caption, color: colors.statusUpcoming, marginTop: spacing.xs, fontWeight: '600' },
  notes: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  owing: { ...typography.caption, color: colors.statusOverdue, marginTop: spacing.xs, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { backgroundColor: colors.surfaceElevated, borderRadius: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle },
  actionText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
});
