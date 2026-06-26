import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { ContactActions } from '@/components/CustomerRow';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteCustomer, fetchCustomer, updateCustomer } from '@/lib/customers';
import { formatDisplayDate, formatRelativeDate } from '@/lib/dates';
import { fetchInvoicesForCustomer } from '@/lib/invoices';
import { fetchJobsForCustomer } from '@/lib/jobs';
import { fetchCustomerSummary, formatMoney } from '@/lib/money';
import { fetchPaymentsForCustomer } from '@/lib/payments';
import { fetchQuotesForCustomer } from '@/lib/quotes';
import { formatAddress } from '@/lib/search';
import { buildCustomerTimeline } from '@/lib/timeline';
import {
  cancelNotificationIds,
  ensureNotificationPermissions,
  scheduleFollowUpNotifications,
} from '@/lib/notifications';
import type { Customer, TimelineEntry } from '@/types/database';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState({ totalSpent: 0, balanceOwing: 0, lastJobTitle: null as string | null, lastJobDate: null as string | null });
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const data = await fetchCustomer(user.id, id);
    if (!data) {
      setCustomer(null);
      return;
    }
    setCustomer(data);
    setNotes(data.notes ?? '');
    const [jobs, quotes, invoices, payments, sum] = await Promise.all([
      fetchJobsForCustomer(user.id, id),
      fetchQuotesForCustomer(user.id, id),
      fetchInvoicesForCustomer(user.id, id),
      fetchPaymentsForCustomer(user.id, id),
      fetchCustomerSummary(user.id, id),
    ]);
    setSummary(sum);
    setTimeline(buildCustomerTimeline(jobs, quotes, invoices, payments, data));
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const saveNotes = async () => {
    if (!user?.id || !customer) return;
    setSavingNotes(true);
    try {
      const updated = await updateCustomer(user.id, customer.id, { notes: notes.trim() || null });
      setCustomer(updated);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete client', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !customer) return;
          await cancelNotificationIds(customer.notification_ids);
          await deleteCustomer(user.id, customer.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Client not found.</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
      </View>
    );
  }

  const address = formatAddress(customer);

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.content} bottomInset={200} wrapStyle={styles.container}>
      <UrgencyBanner followUpAt={customer.follow_up_at} customerName={customer.name} />

      <Text style={styles.name}>{customer.is_favourite ? `⭐ ${customer.name}` : customer.name}</Text>
      <ContactActions customer={customer} />

      {customer.next_action ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Next action</Text>
          <Text style={styles.value}>{customer.next_action}</Text>
          {customer.next_action_due_at ? (
            <Text style={styles.meta}>Due {formatDisplayDate(customer.next_action_due_at)}</Text>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>Contact</Text>
        {customer.phone ? <Text style={styles.value}>{customer.phone}</Text> : null}
        {customer.email ? <Text style={styles.value}>{customer.email}</Text> : null}
        {address ? <Text style={styles.value}>{address}</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Summary</Text>
        <Text style={styles.value}>Total spent: {formatMoney(summary.totalSpent)}</Text>
        <Text style={styles.value}>Balance owing: {formatMoney(summary.balanceOwing)}</Text>
        <Text style={styles.meta}>
          Last job: {summary.lastJobTitle ?? customer.last_appointment ? (summary.lastJobTitle ?? formatRelativeDate(customer.last_appointment)) : 'None'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Notes / preferences</Text>
        <TextInput
          style={[styles.notesInput, inputStyle]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add notes about this client"
          placeholderTextColor={colors.textMuted}
          onBlur={saveNotes}
        />
        {savingNotes ? <Text style={styles.meta}>Saving…</Text> : null}
      </Card>

      <Text style={styles.sectionTitle}>Timeline</Text>
      {timeline.length === 0 ? (
        <Text style={styles.meta}>No history yet.</Text>
      ) : (
        timeline.map((entry) => (
          <Pressable
            key={`${entry.type}-${entry.id}`}
            onPress={() => {
              if (entry.type === 'job') router.push(`/job/${entry.id}`);
              if (entry.type === 'quote') router.push(`/quote/${entry.id}`);
              if (entry.type === 'invoice') router.push(`/invoice/${entry.id}`);
            }}
          >
            <Card style={styles.timelineCard}>
              <Text style={styles.timelineType}>{entry.type}</Text>
              <Text style={styles.value}>{entry.title}</Text>
              <Text style={styles.meta}>
                {new Date(entry.date).toLocaleDateString('en-GB')}
                {entry.amount != null ? ` · ${formatMoney(entry.amount)}` : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.push(`/customer/${customer.id}/edit`)}>
          <Text style={styles.btnText}>Edit client</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => router.push({ pathname: '/job/new', params: { customerId: customer.id } })}>
          <Text style={styles.btnSecondaryText}>+ Job</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleDelete}>
        <Text style={styles.delete}>Delete client</Text>
      </Pressable>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  name: { ...typography.title, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  body: { ...typography.body, color: colors.textPrimary },
  link: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  notesInput: { marginTop: spacing.sm, minHeight: 120, textAlignVertical: 'top' },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  timelineCard: { marginBottom: spacing.sm },
  timelineType: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  btn: { flex: 1, backgroundColor: colors.ctaBackground, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
  delete: { ...typography.body, color: colors.statusOverdue, textAlign: 'center' },
});
