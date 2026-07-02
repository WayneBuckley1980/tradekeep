import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { CustomerPicker } from '@/components/CustomerPicker';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { QuotePicker } from '@/components/QuotePicker';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer } from '@/lib/customers';
import { fetchJob } from '@/lib/jobs';
import { createInvoice, fetchInvoiceForJob, fetchInvoiceForQuote, generateReference } from '@/lib/invoices';
import { fetchQuote } from '@/lib/quotes';
import type { Customer, InvoiceStatus, Quote } from '@/types/database';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'];

export default function NewInvoiceScreen() {
  const { customerId: paramCustomerId, jobId } = useLocalSearchParams<{ customerId?: string; jobId?: string }>();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [linkedJobId, setLinkedJobId] = useState<string | null>(null);
  const [fromJob, setFromJob] = useState(false);
  const [jobInvoiced, setJobInvoiced] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const prefill = async () => {
      if (jobId) {
        const job = await fetchJob(user.id, jobId);
        if (!job) return;

        const existing = await fetchInvoiceForJob(user.id, job.id);
        if (existing) {
          setJobInvoiced(true);
          return;
        }

        setFromJob(true);
        setLinkedJobId(job.id);
        setCustomerId(job.customer_id);
        const customer = await fetchCustomer(user.id, job.customer_id);
        setCustomerName(customer?.name ?? '');
        setTitle(job.title);
        setAmount(job.price != null ? String(job.price) : '');

        if (job.quote_id) {
          const quote = await fetchQuote(user.id, job.quote_id);
          if (quote) {
            const quoteInvoice = await fetchInvoiceForQuote(user.id, quote.id);
            if (!quoteInvoice) {
              setSelectedQuote(quote);
            }
          }
        }
        return;
      }

      if (paramCustomerId) {
        setCustomerId(paramCustomerId);
        const customer = await fetchCustomer(user.id, paramCustomerId);
        setCustomerName(customer?.name ?? '');
      }
    };

    prefill().catch(console.error);
  }, [user?.id, jobId, paramCustomerId]);

  const handleQuoteSelect = (quote: Quote | null) => {
    setSelectedQuote(quote);
    if (quote) {
      setTitle(quote.title);
      setAmount(String(quote.amount));
    }
  };

  const save = async () => {
    if (!user?.id || !customerId || !title.trim()) {
      Alert.alert('Required', 'Select client and enter title.');
      return;
    }

    if (jobInvoiced) {
      Alert.alert('Already invoiced', 'This job has already been invoiced.');
      return;
    }

    try {
      const invoice = await createInvoice(user.id, {
        customer_id: customerId,
        job_id: linkedJobId,
        quote_id: selectedQuote?.id ?? null,
        reference: generateReference(),
        title: title.trim(),
        amount: Number(amount) || 0,
        status,
        due_at: null,
      });
      router.replace(`/invoice/${invoice.id}`);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (!user?.id) return null;

  if (jobInvoiced) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Already invoiced</Text>
        <Text style={styles.blockedText}>This job already has an invoice.</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
        <Pressable style={styles.input} onPress={() => !fromJob && setPickerOpen(true)} disabled={fromJob}>
          <Text style={customerId ? styles.text : styles.placeholder}>{customerName || 'Select client *'}</Text>
        </Pressable>
        <Pressable style={styles.input} onPress={() => customerId && setQuotePickerOpen(true)} disabled={!customerId}>
          <Text style={selectedQuote ? styles.text : styles.placeholder}>
            {selectedQuote?.reference ? `Quote ${selectedQuote.reference}` : 'Link to quote (optional)'}
          </Text>
        </Pressable>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Invoice title *" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount (£) *" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
        <View style={styles.row}>
          {STATUSES.map((s) => (
            <Pressable key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.btn} onPress={save}><Text style={styles.btnText}>Save invoice</Text></Pressable>
      </KeyboardSafeScroll>
      <CustomerPicker userId={user.id} visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(c: Customer) => { setCustomerId(c.id); setCustomerName(c.name); setSelectedQuote(null); }} />
      <QuotePicker
        userId={user.id}
        customerId={customerId}
        jobId={linkedJobId ?? undefined}
        visible={quotePickerOpen}
        onClose={() => setQuotePickerOpen(false)}
        onSelect={handleQuoteSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  blocked: { flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' },
  blockedTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  blockedText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  input: { ...inputStyle, marginBottom: spacing.sm, justifyContent: 'center' },
  text: { color: colors.textPrimary, fontSize: 16 },
  placeholder: { color: colors.textMuted, fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, padding: spacing.sm },
  chipActive: { borderColor: colors.textPrimary },
  chipText: { ...typography.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
