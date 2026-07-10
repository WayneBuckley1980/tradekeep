import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer } from '@/lib/customers';
import { fetchInvoiceForQuote } from '@/lib/invoices';
import { pipelineErrorMessage } from '@/lib/jobPipeline';
import { acceptQuoteAndActivateJob, sendQuoteByEmail } from '@/lib/jobWorkflow';
import { formatMoney } from '@/lib/money';
import { fetchQuote, updateQuote } from '@/lib/quotes';
import type { Customer } from '@/types/database';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof fetchQuote>>>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoicedRef, setInvoicedRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const q = await fetchQuote(user.id, id);
    setQuote(q);
    if (q) {
      const [c, invoice] = await Promise.all([
        fetchCustomer(user.id, q.customer_id),
        fetchInvoiceForQuote(user.id, q.id),
      ]);
      setCustomer(c);
      setInvoicedRef(invoice?.reference ?? null);
    }
  }, [user?.id, id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]));

  const handleSendQuote = async () => {
    if (!user?.id || !quote || !customer || !profile) return;
    setBusy(true);
    try {
      await sendQuoteByEmail(user.id, profile, customer, quote);
      Alert.alert('Quote sent', 'Your mail app opened with the quote PDF attached.');
      load();
    } catch (error) {
      Alert.alert('Could not send quote', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!user?.id || !quote || !customer) return;
    setBusy(true);
    try {
      const job = await acceptQuoteAndActivateJob(user.id, quote, customer);
      router.push(`/job/${job.id}`);
    } catch (error) {
      Alert.alert('Could not accept quote', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !quote) return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{quote.title}</Text>
        <StatusBadge label={quote.status} status={quote.status} />
      </View>
      <Text style={styles.meta}>{quote.reference} · {customer?.name}</Text>
      {invoicedRef ? <Text style={styles.meta}>Invoiced as {invoicedRef}</Text> : null}
      <Text style={styles.amount}>{formatMoney(Number(quote.amount))}</Text>
      {quote.description ? <Card style={styles.card}><Text style={styles.body}>{quote.description}</Text></Card> : null}
      <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleSendQuote}>
        <Text style={styles.btnText}>{quote.status === 'sent' ? 'Resend quote PDF' : 'Send quote PDF & email'}</Text>
      </Pressable>
      <Pressable style={[styles.btnSecondary, busy && styles.btnDisabled]} disabled={busy} onPress={handleAccept}>
        <Text style={styles.btnSecondaryText}>Client accepted → Activate job</Text>
      </Pressable>
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
  btnDisabled: { opacity: 0.6 },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary },
});
