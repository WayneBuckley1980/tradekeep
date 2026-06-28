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
import { useTerminology } from '@/hooks/useTerminology';
import { fetchCustomers } from '@/lib/customers';
import { fetchDashboardKpis, fetchSmartHomeItems } from '@/lib/dashboard';
import { fetchJobs, isJobToday } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import type { Customer, DashboardKpis, Job, SmartHomeItem } from '@/types/database';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const terms = useTerminology();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [smartItems, setSmartItems] = useState<SmartHomeItem[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [c, j, smart, stats] = await Promise.all([
      fetchCustomers(user.id),
      fetchJobs(user.id),
      fetchSmartHomeItems(user.id),
      fetchDashboardKpis(user.id),
    ]);
    setCustomers(c);
    setJobs(j);
    setSmartItems(smart);
    setKpis(stats);
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

      {kpis ? (
        <View style={styles.kpiGrid}>
          <KpiCell label={`${terms.jobs} this month`} value={String(kpis.jobsThisMonth)} />
          <KpiCell label="Revenue" value={formatMoney(kpis.revenueThisMonth)} />
          <KpiCell label="Outstanding" value={formatMoney(kpis.outstanding)} />
          <KpiCell label="Quotes waiting" value={String(kpis.quotesWaiting)} />
          <KpiCell label="Win rate" value={`${kpis.winRate}%`} />
          <KpiCell label="Avg job" value={formatMoney(kpis.averageJob)} />
        </View>
      ) : null}

      <View style={styles.quickRow}>
        {[
          { label: 'Lead', route: '/lead/new' },
          { label: terms.client, route: '/customer/new' },
          { label: terms.job, route: '/job/new' },
          { label: terms.quote, route: '/quote/new' },
        ].map((item) => (
          <Pressable key={item.route} style={styles.quickBtn} onPress={() => router.push(item.route as never)}>
            <Text style={styles.quickBtnText}>+ {item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Section title="Today">
        {smartItems.length === 0 ? (
          <Text style={styles.empty}>You're all caught up.</Text>
        ) : (
          smartItems.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(item.route as never)}>
              <Card style={styles.smartCard}>
                <Text style={styles.smartText}>{item.icon} {item.title}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </Section>

      <Section title={`${terms.todaysJobs} (${todayJobs.length})`}>
        {todayJobs.length === 0 ? (
          <Text style={styles.empty}>Nothing scheduled for today.</Text>
        ) : (
          todayJobs.map((job) => <JobRow key={job.id} job={job} customerName={customerMap.get(job.customer_id)} />)
        )}
      </Section>

      <Section title="Recent clients">
        {[...customers].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5).map((c) => (
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

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCell}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCell: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    padding: spacing.sm,
    minWidth: 100,
  },
  kpiValue: { ...typography.heading, color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  kpiLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
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
  smartCard: { marginBottom: spacing.sm },
  smartText: { ...typography.body, color: colors.textPrimary },
  actionCard: { marginBottom: spacing.sm },
  actionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
});
