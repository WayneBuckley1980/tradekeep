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
import { router, useFocusEffect } from 'expo-router';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomers } from '@/lib/customers';
import { deleteInvoice, effectiveInvoiceStatus, fetchInvoices } from '@/lib/invoices';
import { fetchMoneyStats, formatMoney } from '@/lib/money';
import { fetchPayments } from '@/lib/payments';
import { deleteQuote, fetchQuotes } from '@/lib/quotes';
import type { Customer, Invoice, Payment, Quote } from '@/types/database';

const SECTIONS = ['overview', 'quotes', 'invoices', 'payments'] as const;
type MoneySection = (typeof SECTIONS)[number];

export default function MoneyScreen() {
  const { user } = useAuth();
  const [section, setSection] = useState<MoneySection>('overview');
  const [stats, setStats] = useState({ outstanding: 0, paidThisMonth: 0, paidThisYear: 0, averageJobValue: 0 });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [s, q, inv, pay, c] = await Promise.all([
      fetchMoneyStats(user.id),
      fetchQuotes(user.id),
      fetchInvoices(user.id),
      fetchPayments(user.id),
      fetchCustomers(user.id),
    ]);
    setStats(s);
    setQuotes(q);
    setInvoices(inv);
    setPayments(pay);
    setCustomers(c);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [load]),
  );

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const removeQuote = async (quoteId: string) => {
    if (!user?.id) return;
    await deleteQuote(user.id, quoteId);
    setQuotes(await fetchQuotes(user.id));
  };

  const removeInvoice = async (invoiceId: string) => {
    if (!user?.id) return;
    await deleteInvoice(user.id, invoiceId);
    setInvoices(await fetchInvoices(user.id));
  };

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
        {SECTIONS.map((s) => (
          <Pressable key={s} style={[styles.tab, section === s && styles.tabActive]} onPress={() => setSection(s)}>
            <Text style={[styles.tabText, section === s && styles.tabTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {section === 'overview' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, stats.outstanding > 0 && styles.overdue]}>{formatMoney(stats.outstanding)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Paid this month</Text>
            <Text style={styles.statValue}>{formatMoney(stats.paidThisMonth)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Paid this year</Text>
            <Text style={styles.statValue}>{formatMoney(stats.paidThisYear)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Average job value</Text>
            <Text style={styles.statValue}>{formatMoney(stats.averageJobValue)}</Text>
          </Card>
        </ScrollView>
      ) : null}

      {section === 'quotes' ? (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SwipeToDelete
              deleteLabel="Delete"
              confirmTitle="Delete quote"
              onDelete={() => removeQuote(item.id)}
            >
              <Pressable onPress={() => router.push(`/quote/${item.id}`)}>
                <Card style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <StatusBadge label={item.status} status={item.status} />
                  </View>
                  <Text style={styles.rowSub}>{customerMap.get(item.customer_id)}</Text>
                  <Text style={styles.rowAmount}>{formatMoney(Number(item.amount))}</Text>
                </Card>
              </Pressable>
            </SwipeToDelete>
          )}
          ListEmptyComponent={<EmptyState title="No quotes" message="Create a quote from + menu." />}
        />
      ) : null}

      {section === 'invoices' ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const status = effectiveInvoiceStatus(item);
            return (
              <SwipeToDelete
                deleteLabel="Delete"
                confirmTitle="Delete invoice"
                onDelete={() => removeInvoice(item.id)}
              >
                <Pressable onPress={() => router.push(`/invoice/${item.id}`)}>
                  <Card style={styles.row}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <StatusBadge label={status} status={status} />
                    </View>
                    <Text style={styles.rowSub}>{customerMap.get(item.customer_id)}</Text>
                    <Text style={styles.rowAmount}>{formatMoney(Number(item.amount))}</Text>
                  </Card>
                </Pressable>
              </SwipeToDelete>
            );
          }}
          ListEmptyComponent={<EmptyState title="No invoices" message="Create an invoice when work is done." />}
        />
      ) : null}

      {section === 'payments' ? (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={styles.rowTitle}>{formatMoney(Number(item.amount))}</Text>
              <Text style={styles.rowSub}>{customerMap.get(item.customer_id)}</Text>
              <Text style={styles.rowSub}>{new Date(item.paid_at).toLocaleDateString('en-GB')}</Text>
            </Card>
          )}
          ListEmptyComponent={<EmptyState title="No payments" message="Record a payment against an invoice." />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabs: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tabsContent: { paddingHorizontal: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  tabText: { ...typography.caption, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: '600' },
  content: { padding: spacing.md, paddingBottom: 120 },
  list: { padding: spacing.md, paddingBottom: 120 },
  statCard: { marginBottom: spacing.sm },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs, fontSize: 24 },
  overdue: { color: colors.statusOverdue },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  rowAmount: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs },
});
