import { useCallback, useMemo, useState } from 'react';
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
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import { Card } from '@/components/Card';
import { ContactActions } from '@/components/CustomerRow';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import { fetchCustomer } from '@/lib/customers';
import { deleteInvoice, fetchInvoicesForCustomer } from '@/lib/invoices';
import { fetchJobsForCustomer } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { deleteQuote, fetchQuotesForCustomer } from '@/lib/quotes';
import {
  buildCustomerWorkflow,
  WORKFLOW_STAGES,
  workflowItemRoute,
  type WorkflowItem,
  type WorkflowStage,
} from '@/lib/workflow';
import type { Customer, Invoice, Job, Quote } from '@/types/database';

export default function CustomerWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const terms = useTerminology();
  const navigation = useNavigation();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stage, setStage] = useState<WorkflowStage>('quote');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const stageLabels: Record<WorkflowStage, string> = {
    quote: terms.workflowQuote,
    order: terms.workflowOrder,
    work: terms.workflowWork,
    invoice: terms.workflowInvoice,
    closed: terms.workflowClosed,
  };

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const data = await fetchCustomer(user.id, id);
    if (!data) {
      setCustomer(null);
      return;
    }
    setCustomer(data);
    navigation.setOptions({ title: data.name });
    const [q, j, inv] = await Promise.all([
      fetchQuotesForCustomer(user.id, id),
      fetchJobsForCustomer(user.id, id),
      fetchInvoicesForCustomer(user.id, id),
    ]);
    setQuotes(q);
    setJobs(j);
    setInvoices(inv);
  }, [user?.id, id, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const workflow = useMemo(
    () => buildCustomerWorkflow(quotes, jobs, invoices),
    [quotes, jobs, invoices],
  );
  const items = workflow[stage];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteItem = async (item: WorkflowItem) => {
    if (!user?.id) return;
    if (item.kind === 'quote') await deleteQuote(user.id, item.id);
    if (item.kind === 'invoice') await deleteInvoice(user.id, item.id);
    await load();
  };

  const renderItem = ({ item }: { item: WorkflowItem }) => {
    const canDelete = item.kind === 'quote' || item.kind === 'invoice';
    const row = (
      <Pressable onPress={() => router.push(workflowItemRoute(item) as never)}>
        <Card style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.status ? <StatusBadge label={item.status} status={item.status} /> : null}
          </View>
          {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
          <Text style={styles.rowMeta}>
            {new Date(item.date).toLocaleDateString('en-GB')}
            {item.amount != null ? ` · ${formatMoney(item.amount)}` : ''}
          </Text>
        </Card>
      </Pressable>
    );

    if (!canDelete) return row;

    return (
      <SwipeToDelete
        deleteLabel="Delete"
        confirmTitle={`Delete ${item.kind}`}
        onDelete={() => handleDeleteItem(item)}
      >
        {row}
      </SwipeToDelete>
    );
  };

  const emptyMessages: Record<WorkflowStage, { title: string; message: string }> = {
    quote: { title: `No ${terms.quotes.toLowerCase()}`, message: `Create a ${terms.quote.toLowerCase()} to start the workflow.` },
    order: { title: 'Nothing agreed yet', message: `Mark a ${terms.quote.toLowerCase()} accepted or schedule a ${terms.job.toLowerCase()}.` },
    work: { title: 'No completed work', message: `Complete a ${terms.job.toLowerCase()} when work is done.` },
    invoice: { title: 'No invoices', message: 'Raise an invoice when ready to bill.' },
    closed: { title: 'Nothing closed yet', message: 'Paid invoices and closed jobs appear here.' },
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
        <Pressable onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.link}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UrgencyBanner followUpAt={customer.follow_up_at} customerName={customer.name} />

      <View style={styles.header}>
        <Text style={styles.name}>
          {customer.is_favourite ? `⭐ ${customer.name}` : customer.name}
        </Text>
        <ContactActions customer={customer} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {WORKFLOW_STAGES.map((s) => (
          <Pressable
            key={s}
            style={[styles.tab, stage === s && styles.tabActive]}
            onPress={() => setStage(s)}
          >
            <Text style={[styles.tabText, stage === s && styles.tabTextActive]} numberOfLines={1}>
              {stageLabels[s]}
            </Text>
            {workflow[s].length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{workflow[s].length}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
        ListEmptyComponent={
          <EmptyState title={emptyMessages[stage].title} message={emptyMessages[stage].message} />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push({ pathname: '/job/new', params: { customerId: customer.id } })}
            >
              <Text style={styles.primaryBtnText}>+ New {terms.job.toLowerCase()}</Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => router.push({ pathname: '/quote/new', params: { customerId: customer.id } })}
              >
                <Text style={styles.secondaryBtnText}>+ {terms.quote}</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => router.push({ pathname: '/invoice/new', params: { customerId: customer.id } })}
              >
                <Text style={styles.secondaryBtnText}>+ Invoice</Text>
              </Pressable>
            </View>
            <Pressable style={styles.detailsLink} onPress={() => router.push(`/customer/${customer.id}/details`)}>
              <Text style={styles.detailsLinkText}>Client details & timeline →</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  name: { ...typography.title, color: colors.textPrimary, fontSize: 24, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.textPrimary },
  link: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  tabs: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tabsContent: { paddingHorizontal: spacing.sm, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    gap: spacing.xs,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  tabText: { ...typography.caption, color: colors.textMuted, maxWidth: 120 },
  tabTextActive: { color: colors.textPrimary, fontWeight: '600' },
  countBadge: { backgroundColor: colors.surfaceElevated, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, alignItems: 'center' },
  countText: { ...typography.caption, color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  footer: { marginTop: spacing.md, gap: spacing.sm },
  primaryBtn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  primaryBtnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  secondaryBtnText: { ...typography.label, color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  detailsLink: { alignItems: 'center', paddingVertical: spacing.sm },
  detailsLinkText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
});
