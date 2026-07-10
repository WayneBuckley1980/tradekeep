import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { CustomerPicker } from '@/components/CustomerPicker';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { QuoteLineItemsForm, useQuoteLineItemsState } from '@/components/QuoteLineItemsForm';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer } from '@/lib/customers';
import { fetchJob, updateJob } from '@/lib/jobs';
import { fetchQuoteLineItems, saveQuoteLineItems } from '@/lib/quoteItems';
import { createQuote, fetchQuote, generateReference, updateQuote } from '@/lib/quotes';
import type { Customer, QuoteStatus } from '@/types/database';

const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

export default function NewQuoteScreen() {
  const { customerId: paramCustomerId, jobId, quoteId } = useLocalSearchParams<{
    customerId?: string;
    jobId?: string;
    quoteId?: string;
  }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isEditMode = Boolean(quoteId);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('sent');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fromJob, setFromJob] = useState(false);
  const [loading, setLoading] = useState(Boolean(quoteId));
  const { items, setItems, discount, setDiscount } = useQuoteLineItemsState();

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Edit quote' : 'New quote' });
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (!user?.id) return;

    const prefill = async () => {
      if (quoteId) {
        const quote = await fetchQuote(user.id, quoteId);
        if (!quote) return;
        setCustomerId(quote.customer_id);
        const customer = await fetchCustomer(user.id, quote.customer_id);
        setCustomerName(customer?.name ?? '');
        setTitle(quote.title);
        setDescription(quote.description ?? '');
        setStatus(quote.status);
        if (quote.job_id) setFromJob(true);

        const lineItems = await fetchQuoteLineItems(user.id, quoteId);
        const discountItem = lineItems.find((i) => i.label === 'Discount');
        const regularItems = lineItems.filter((i) => i.label !== 'Discount');
        if (discountItem) {
          setDiscount(String(Math.abs(Number(discountItem.amount))));
        }
        if (regularItems.length > 0) {
          setItems(regularItems.map((i) => ({ label: i.label, amount: String(i.amount) })));
        }
        setLoading(false);
        return;
      }

      if (jobId) {
        const job = await fetchJob(user.id, jobId);
        if (!job) return;
        setFromJob(true);
        setCustomerId(job.customer_id);
        const customer = await fetchCustomer(user.id, job.customer_id);
        setCustomerName(customer?.name ?? '');
        setTitle(job.title);
        setDescription(job.description ?? '');
        if (job.price != null && Number(job.price) > 0) {
          setItems([{ label: job.title, amount: String(job.price) }]);
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
  }, [user?.id, jobId, paramCustomerId, quoteId, setItems, setDiscount]);

  const save = async () => {
    if (!user?.id || !customerId || !title.trim()) {
      Alert.alert('Required', 'Select client and enter title.');
      return;
    }

    const lineItems = items
      .filter((i) => i.label.trim())
      .map((i) => ({ label: i.label.trim(), amount: Number(i.amount) || 0 }));

    const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0);
    const total = Math.max(0, subtotal - (Number(discount) || 0));

    if (quoteId) {
      await updateQuote(user.id, quoteId, {
        title: title.trim(),
        description: description.trim() || null,
        amount: total,
        status,
      });

      const rows = [...lineItems];
      if (Number(discount) > 0) {
        rows.push({ label: 'Discount', amount: -Number(discount) });
      }
      await saveQuoteLineItems(user.id, quoteId, rows);
      router.replace(`/quote/${quoteId}`);
      return;
    }

    const quote = await createQuote(user.id, {
      customer_id: customerId,
      job_id: jobId ?? null,
      reference: generateReference(),
      title: title.trim(),
      description: description.trim() || null,
      amount: total,
      status,
      valid_until: null,
    });

    if (lineItems.length > 0) {
      const rows = [...lineItems];
      if (Number(discount) > 0) {
        rows.push({ label: 'Discount', amount: -Number(discount) });
      }
      await saveQuoteLineItems(user.id, quote.id, rows);
    }

    if (jobId) {
      await updateJob(user.id, jobId, { quote_id: quote.id });
    }

    router.replace(`/quote/${quote.id}`);
  };

  if (!user?.id) return null;
  if (loading) return null;

  return (
    <>
      <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
        <Pressable style={styles.input} onPress={() => !fromJob && !isEditMode && setPickerOpen(true)} disabled={fromJob || isEditMode}>
          <Text style={customerId ? styles.text : styles.placeholder}>{customerName || 'Select client *'}</Text>
        </Pressable>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Quote title *" placeholderTextColor={colors.textMuted} />
        <QuoteLineItemsForm items={items} onChange={setItems} discount={discount} onDiscountChange={setDiscount} />
        <TextInput style={[styles.input, styles.multi]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textMuted} multiline />
        <View style={styles.row}>
          {STATUSES.map((s) => (
            <Pressable key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.btn} onPress={save}><Text style={styles.btnText}>{isEditMode ? 'Update quote' : 'Save quote'}</Text></Pressable>
      </KeyboardSafeScroll>
      <CustomerPicker userId={user.id} visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(c: Customer) => { setCustomerId(c.id); setCustomerName(c.name); }} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  input: { ...inputStyle, marginBottom: spacing.sm, justifyContent: 'center' },
  text: { color: colors.textPrimary, fontSize: 16 },
  placeholder: { color: colors.textMuted, fontSize: 16 },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, padding: spacing.sm },
  chipActive: { borderColor: colors.textPrimary },
  chipText: { ...typography.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
