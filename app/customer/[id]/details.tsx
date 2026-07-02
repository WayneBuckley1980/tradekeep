import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { ClientDocumentsSection } from '@/components/ClientDocumentsSection';
import { ContactActions } from '@/components/CustomerRow';
import { EquipmentSection } from '@/components/EquipmentSection';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { PropertyHistorySection } from '@/components/PropertyHistorySection';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import { COMM_TYPES, fetchCommunicationLogs, logCommunication } from '@/lib/communication';
import { deleteCustomer, fetchCustomer, updateCustomer } from '@/lib/customers';
import { getCustomerHealth, healthLabel, ratingStars } from '@/lib/customerHealth';
import { formatDisplayDate, formatRelativeDate } from '@/lib/dates';
import { fetchInvoicesForCustomer } from '@/lib/invoices';
import { fetchJobsForCustomer } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { cancelNotificationIds } from '@/lib/notifications';
import { fetchPaymentsForCustomer } from '@/lib/payments';
import { ensurePrimaryProperty, fetchPropertiesForCustomer, groupJobsByProperty } from '@/lib/properties';
import { fetchQuotesForCustomer } from '@/lib/quotes';
import { formatAddress } from '@/lib/search';
import { buildCustomerTimeline } from '@/lib/timeline';
import type { CommunicationLog, Customer, CustomerHealth, TimelineEntry } from '@/types/database';
import type { PropertyJobGroup } from '@/lib/properties';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const terms = useTerminology();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [health, setHealth] = useState<CustomerHealth | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [propertyGroups, setPropertyGroups] = useState<PropertyJobGroup[]>([]);
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
    const [jobs, quotes, invoices, payments, logs, healthData] = await Promise.all([
      fetchJobsForCustomer(user.id, id),
      fetchQuotesForCustomer(user.id, id),
      fetchInvoicesForCustomer(user.id, id),
      fetchPaymentsForCustomer(user.id, id),
      fetchCommunicationLogs(user.id, id),
      getCustomerHealth(user.id, data),
    ]);
    setHealth(healthData);
    setCommLogs(logs);
    setTimeline(buildCustomerTimeline(jobs, quotes, invoices, payments, data));
    await ensurePrimaryProperty(user.id, data);
    const properties = await fetchPropertiesForCustomer(user.id, id);
    setPropertyGroups(groupJobsByProperty(jobs, properties));
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

  const setRating = async (rating: number) => {
    if (!user?.id || !customer) return;
    const updated = await updateCustomer(user.id, customer.id, { rating });
    setCustomer(updated);
    setHealth(await getCustomerHealth(user.id, updated));
  };

  const handleLogComm = async (type: (typeof COMM_TYPES)[number]['id']) => {
    if (!user?.id || !customer) return;
    await logCommunication(user.id, customer.id, type);
    setCommLogs(await fetchCommunicationLogs(user.id, customer.id));
    const refreshed = await fetchCustomer(user.id, customer.id);
    if (refreshed) setCustomer(refreshed);
  };

  const handleArchive = async () => {
    if (!user?.id || !customer) return;
    Alert.alert('Archive client', 'Hide from your active list? You can restore later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: async () => {
          await updateCustomer(user.id, customer.id, { archived_at: new Date().toISOString() });
          router.replace('/(tabs)/home');
        },
      },
    ]);
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
          router.replace('/(tabs)/home');
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

      <Text style={styles.name}>
        {customer.is_favourite ? `⭐ ${customer.name}` : customer.name}
        {customer.rating ? ` ${ratingStars(customer.rating)}` : ''}
      </Text>
      <ContactActions customer={customer} />

      {health ? (
        <Card style={styles.card}>
          <Text style={[styles.healthBadge, health.isVip && styles.vip, health.isInactive && styles.inactive]}>
            {healthLabel(health)}
          </Text>
          <Text style={styles.value}>Customer since: {health.customerSince}</Text>
          <Text style={styles.value}>
            Last {terms.job.toLowerCase()}: {health.lastJobTitle ?? health.lastJobDate ?? 'None'}
            {health.lastJobDate && !health.lastJobTitle ? ` (${formatRelativeDate(health.lastJobDate)})` : ''}
          </Text>
          <Text style={styles.value}>Lifetime spend: {formatMoney(health.lifetimeSpend)}</Text>
          <Text style={styles.value}>{terms.jobs}: {health.jobCount}</Text>
          <Text style={styles.value}>Outstanding: {formatMoney(health.outstanding)}</Text>
          {health.suggestFollowUp ? (
            <Pressable
              style={styles.followUpBtn}
              onPress={() => router.push({ pathname: '/customer/[id]/edit', params: { id: customer.id } })}
            >
              <Text style={styles.followUpText}>Suggest follow up</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

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
        <Text style={styles.label}>Private rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)}>
              <Text style={styles.star}>{(customer.rating ?? 0) >= n ? '★' : '☆'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Communication log</Text>
        {customer.last_contacted_at ? (
          <Text style={styles.meta}>Last contacted {formatRelativeDate(customer.last_contacted_at)}</Text>
        ) : (
          <Text style={styles.meta}>No contact logged yet</Text>
        )}
        <View style={styles.commRow}>
          {COMM_TYPES.slice(0, 5).map((t) => (
            <Pressable key={t.id} style={styles.commChip} onPress={() => handleLogComm(t.id)}>
              <Text style={styles.commText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        {commLogs.slice(0, 5).map((log) => (
          <Text key={log.id} style={styles.meta}>
            {log.type} · {new Date(log.logged_at).toLocaleDateString('en-GB')}
          </Text>
        ))}
      </Card>

      {address ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Property</Text>
          <Text style={styles.value}>{address}</Text>
        </Card>
      ) : null}

      {user?.id ? (
        <>
          <PropertyHistorySection groups={propertyGroups} jobLabel={terms.job} />
          <EquipmentSection userId={user.id} customerId={customer.id} />
          <ClientDocumentsSection userId={user.id} customerId={customer.id} />
        </>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>{terms.siteNotes}</Text>
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
          <Text style={styles.btnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => router.back()}>
          <Text style={styles.btnSecondaryText}>← Workspace</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleArchive}>
        <Text style={styles.archive}>Archive client</Text>
      </Pressable>
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
  healthBadge: { ...typography.label, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  vip: { color: '#FFD700' },
  inactive: { color: colors.statusOverdue },
  followUpBtn: { marginTop: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  followUpText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  star: { fontSize: 28, color: '#FFD700' },
  commRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  commChip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  commText: { ...typography.caption, color: colors.textPrimary },
  notesInput: { marginTop: spacing.sm, minHeight: 100, textAlignVertical: 'top' },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  timelineCard: { marginBottom: spacing.sm },
  timelineType: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  btn: { flex: 1, backgroundColor: colors.ctaBackground, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
  archive: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  delete: { ...typography.body, color: colors.statusOverdue, textAlign: 'center' },
});
