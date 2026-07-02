import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { scheduleAfterPaidReminder, syncCustomerPaidTotal } from '@/lib/automations';
import { fetchCustomer } from '@/lib/customers';
import { duplicateInvoice, effectiveInvoiceStatus, fetchInvoice, updateInvoice } from '@/lib/invoices';
import { formatMoney } from '@/lib/money';
import { createPayment } from '@/lib/payments';
import { fetchQuote } from '@/lib/quotes';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Awaited<ReturnType<typeof fetchInvoice>>>(null);
  const [customerName, setCustomerName] = useState('');
  const [linkedQuoteRef, setLinkedQuoteRef] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const inv = await fetchInvoice(user.id, id);
    setInvoice(inv);
    if (inv) {
      const c = await fetchCustomer(user.id, inv.customer_id);
      setCustomerName(c?.name ?? '');
      setPaymentAmount(String(inv.amount));
      if (inv.quote_id) {
        const quote = await fetchQuote(user.id, inv.quote_id);
        setLinkedQuoteRef(quote?.reference ?? null);
      } else {
        setLinkedQuoteRef(null);
      }
    }
  }, [user?.id, id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]));

  const recordPayment = async () => {
    if (!user?.id || !invoice) return;
    const amount = Number(paymentAmount);
    if (!amount) return;
    await createPayment(user.id, {
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      job_id: invoice.job_id,
      amount,
      paid_at: new Date().toISOString(),
      method: 'bank',
      notes: null,
    });
    await updateInvoice(user.id, invoice.id, { status: 'paid' });
    await syncCustomerPaidTotal(user.id, invoice.customer_id);
    await scheduleAfterPaidReminder(user.id, invoice.customer_id);
    Alert.alert('Payment recorded', 'Invoice marked as paid. Client balance updated.');
    load();
  };

  const handleDuplicate = async () => {
    if (!user?.id || !invoice) return;
    const dup = await duplicateInvoice(user.id, invoice);
    router.push(`/invoice/${dup.id}`);
  };

  if (loading || !invoice) return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;

  const status = effectiveInvoiceStatus(invoice);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{invoice.title}</Text>
        <StatusBadge label={status} status={status} />
      </View>
      <Text style={styles.meta}>{invoice.reference} · {customerName}</Text>
      {linkedQuoteRef ? <Text style={styles.meta}>Quote {linkedQuoteRef}</Text> : null}
      <Text style={styles.amount}>{formatMoney(Number(invoice.amount))}</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Record payment</Text>
        <TextInput style={styles.input} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.btn} onPress={recordPayment}><Text style={styles.btnText}>Mark paid</Text></Pressable>
      </Card>

      <Pressable style={styles.btnSecondary} onPress={handleDuplicate}>
        <Text style={styles.btnSecondaryText}>Duplicate invoice</Text>
      </Pressable>
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
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  input: { ...inputStyle, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary },
});
