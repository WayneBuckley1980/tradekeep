import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer } from '@/lib/customers';
import { createJob } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { fetchQuote, updateQuote } from '@/lib/quotes';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof fetchQuote>>>(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const q = await fetchQuote(user.id, id);
    setQuote(q);
    if (q) {
      const c = await fetchCustomer(user.id, q.customer_id);
      setCustomerName(c?.name ?? '');
    }
  }, [user?.id, id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]));

  const acceptAndCreateJob = async () => {
    if (!user?.id || !quote) return;
    await updateQuote(user.id, quote.id, { status: 'accepted' });
    const customer = await fetchCustomer(user.id, quote.customer_id);
    const job = await createJob(user.id, {
      customer_id: quote.customer_id,
      title: quote.title,
      description: quote.description,
      scheduled_at: new Date().toISOString(),
      duration_minutes: null,
      address_line1: customer?.address_line1 ?? null,
      city: customer?.city ?? null,
      postcode: customer?.postcode ?? null,
      status: 'upcoming',
      price: quote.amount,
      materials: null,
      notes: null,
      quote_id: quote.id,
    });
    await updateQuote(user.id, quote.id, { job_id: job.id });
    router.push(`/job/${job.id}`);
  };

  if (loading || !quote) return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{quote.title}</Text>
        <StatusBadge label={quote.status} status={quote.status} />
      </View>
      <Text style={styles.meta}>{quote.reference} · {customerName}</Text>
      <Text style={styles.amount}>{formatMoney(Number(quote.amount))}</Text>
      {quote.description ? <Card style={styles.card}><Text style={styles.body}>{quote.description}</Text></Card> : null}
      <Pressable style={styles.btn} onPress={acceptAndCreateJob}><Text style={styles.btnText}>Accept → Create job</Text></Pressable>
      <Pressable style={styles.btnSecondary} onPress={async () => {
        if (!user?.id) return;
        await updateQuote(user.id, quote.id, { status: 'rejected' });
        load();
      }}><Text style={styles.btnSecondaryText}>Mark rejected</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, flex: 1, fontSize: 22 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  amount: { ...typography.heading, color: colors.textPrimary, marginVertical: spacing.md },
  card: { marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textPrimary },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary },
});
