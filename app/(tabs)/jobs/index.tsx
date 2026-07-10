import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { JobRow } from '@/components/JobRow';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomers } from '@/lib/customers';
import { fetchJobs, filterJobsByTab } from '@/lib/jobs';
import { reconcileJobPipelineFromInvoices } from '@/lib/jobWorkflow';
import type { Customer, Job } from '@/types/database';

const TABS = ['today', 'upcoming', 'in_progress', 'completed', 'cancelled'] as const;
type JobTab = (typeof TABS)[number];

const TAB_LABELS: Record<JobTab, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function JobsScreen() {
  const { user } = useAuth();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tab, setTab] = useState<JobTab>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [j, c] = await Promise.all([fetchJobs(user.id), fetchCustomers(user.id)]);
    const reconciled = await Promise.all(
      j.map(async (job) =>
        job.pipeline_status === 'complete' ? job : reconcileJobPipelineFromInvoices(user.id, job),
      ),
    );
    setJobs(reconciled);
    setCustomers(c);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (tabParam && TABS.includes(tabParam as JobTab)) {
        setTab(tabParam as JobTab);
      }
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load, tabParam]),
  );

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const filtered = filterJobsByTab(jobs, tab);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {TABS.map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{TAB_LABELS[t]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobRow job={item} customerName={customerMap.get(item.customer_id)} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await load();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.textPrimary}
          />
        }
        ListEmptyComponent={
          <EmptyState title="No jobs here" message="Tap + to schedule work for a client." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabs: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tabsContent: { paddingHorizontal: spacing.sm, alignItems: 'center' },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  tabText: { ...typography.caption, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: '600' },
  list: { padding: spacing.md, paddingBottom: 120 },
});
