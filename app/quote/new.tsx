import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { CustomerPicker } from '@/components/CustomerPicker';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { QuoteLineItemsForm, useQuoteLineItemsState } from '@/components/QuoteLineItemsForm';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { saveQuoteLineItems } from '@/lib/quoteItems';
import { createQuote, generateReference } from '@/lib/quotes';
import type { Customer, QuoteStatus } from '@/types/database';

const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

export default function NewQuoteScreen() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('sent');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { items, setItems, discount, setDiscount } = useQuoteLineItemsState();

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

    const quote = await createQuote(user.id, {
      customer_id: customerId,
      job_id: null,
      reference: generateReference('Q'),
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

    router.replace(`/quote/${quote.id}`);
  };

  if (!user?.id) return null;

  return (
    <>
      <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
        <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
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
        <Pressable style={styles.btn} onPress={save}><Text style={styles.btnText}>Save quote</Text></Pressable>
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
