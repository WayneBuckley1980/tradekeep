import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card } from '@/components/Card';
import { JobRow } from '@/components/JobRow';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomers } from '@/lib/customers';
import { daysUntilFollowUp, getFollowUpUrgency } from '@/lib/dates';
import { effectiveInvoiceStatus, fetchInvoices } from '@/lib/invoices';
import { fetchJobs, isJobToday } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { fetchQuotes } from '@/lib/quotes';
import type { Customer, Invoice, Job, Quote } from '@/types/database';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [c, j, q, inv] = await Promise.all([
      fetchCustomers(user.id),
      fetchJobs(user.id),
      fetchQuotes(user.id),
      fetchInvoices(user.id),
    ]);
    setCustomers(c);
    setJobs(j);
    setQuotes(q);
    setInvoices(inv);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  const name = profile?.business_name?.split(' ')[0] ?? 'there';
  const todayJobs = jobs.filter((j) => j.status !== 'cancelled' && j.status !== 'completed' && isJobToday(j.scheduled_at));
  const upcomingJobs = jobs.filter(
    (j) => j.status === 'upcoming' && !isJobToday(j.scheduled_at) && new Date(j.scheduled_at) > new Date(),
  ).slice(0, 5);
  const waitingQuotes = quotes.filter((q) => q.status === 'sent');
  const overdueInvoices = invoices.filter((i) => effectiveInvoiceStatus(i) === 'overdue');
  const outstandingInvoices = invoices.filter((i) => {
    const s = effectiveInvoiceStatus(i);
    return s === 'sent' || s === 'overdue';
  });
  const nextActions = customers.filter((c) => c.next_action && c.next_action_due_at);
  const todayReminders = customers.filter((c) => {
    const u = getFollowUpUrgency(c.follow_up_at);
    return u === 'overdue' || u === 'today';
  });
  const favourites = customers.filter((c) => c.is_favourite).slice(0, 5);
  const recent = [...customers].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      <Pressable onPress={() => router.push('/search')}>
        <View style={styles.searchStub}>
          <Text style={styles.searchText}>Search clients, jobs, notes…</Text>
        </View>
      </Pressable>

      <Text style={styles.greeting}>Good morning, {name} 👋</Text>

      <View style={styles.quickRow}>
        {[
          { label: 'Client', route: '/customer/new' },
          { label: 'Job', route: '/job/new' },
          { label: 'Quote', route: '/quote/new' },
          { label: 'Invoice', route: '/invoice/new' },
        ].map((item) => (
          <Pressable key={item.route} style={styles.quickBtn} onPress={() => router.push(item.route as never)}>
            <Text style={styles.quickBtnText}>+ {item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Section title={`Today's jobs (${todayJobs.length})`}>
        {todayJobs.length === 0 ? (
          <Text style={styles.empty}>Nothing scheduled for today.</Text>
        ) : (
          todayJobs.map((job) => <JobRow key={job.id} job={job} customerName={customerMap.get(job.customer_id)} />)
        )}
      </Section>

      <Section title="Next actions">
        {nextActions.length === 0 ? (
          <Text style={styles.empty}>No next actions set.</Text>
        ) : (
          nextActions.slice(0, 8).map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}`)}>
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>{c.next_action}</Text>
                <Text style={styles.actionSub}>{c.name}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>

      <Section title="Today's reminders">
        {todayReminders.length === 0 ? (
          <Text style={styles.empty}>No follow-ups due today.</Text>
        ) : (
          todayReminders.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}`)}>
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>Follow up: {c.name}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>

      <Section title={`Outstanding quotes (${waitingQuotes.length})`}>
        {waitingQuotes.length === 0 ? (
          <Text style={styles.empty}>No quotes waiting.</Text>
        ) : (
          waitingQuotes.slice(0, 5).map((q) => (
            <Pressable key={q.id} onPress={() => router.push(`/quote/${q.id}`)}>
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>{q.title}</Text>
                <Text style={styles.actionSub}>{formatMoney(Number(q.amount))}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>

      <Section title={`Invoices waiting (${outstandingInvoices.length})`}>
        {outstandingInvoices.length === 0 ? (
          <Text style={styles.empty}>All caught up.</Text>
        ) : (
          outstandingInvoices.slice(0, 5).map((inv) => (
            <Pressable key={inv.id} onPress={() => router.push(`/invoice/${inv.id}`)}>
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>{inv.title}</Text>
                <Text style={[styles.actionSub, effectiveInvoiceStatus(inv) === 'overdue' && styles.overdue]}>
                  {formatMoney(Number(inv.amount))} · {effectiveInvoiceStatus(inv)}
                </Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>

      {overdueInvoices.length > 0 ? (
        <Section title={`Overdue (${overdueInvoices.length})`}>
          {overdueInvoices.map((inv) => (
            <Pressable key={inv.id} onPress={() => router.push(`/invoice/${inv.id}`)}>
              <Card style={styles.actionCard}>
                <Text style={[styles.actionTitle, styles.overdue]}>{inv.title}</Text>
              </Card>
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section title="Recent clients">
        {recent.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}`)}>
            <Card style={styles.actionCard}>
              <Text style={styles.actionTitle}>{c.is_favourite ? `⭐ ${c.name}` : c.name}</Text>
            </Card>
          </Pressable>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  searchStub: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchText: { ...typography.body, color: colors.textMuted },
  greeting: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickBtnText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  empty: { ...typography.caption, color: colors.textMuted },
  actionCard: { marginBottom: spacing.sm },
  actionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  actionSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  overdue: { color: colors.statusOverdue },
});
