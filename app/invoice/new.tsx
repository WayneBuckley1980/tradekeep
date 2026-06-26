import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { CustomerPicker } from '@/components/CustomerPicker';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { createInvoice, generateReference } from '@/lib/invoices';
import type { Customer, InvoiceStatus } from '@/types/database';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'];

export default function NewInvoiceScreen() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [pickerOpen, setPickerOpen] = useState(false);

  const save = async () => {
    if (!user?.id || !customerId || !title.trim()) {
      Alert.alert('Required', 'Select client and enter title.');
      return;
    }
    const invoice = await createInvoice(user.id, {
      customer_id: customerId,
      job_id: null,
      quote_id: null,
      reference: generateReference('INV'),
      title: title.trim(),
      amount: Number(amount) || 0,
      status,
      due_at: null,
    });
    router.replace(`/invoice/${invoice.id}`);
  };

  if (!user?.id) return null;

  return (
    <>
      <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
        <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
          <Text style={customerId ? styles.text : styles.placeholder}>{customerName || 'Select client *'}</Text>
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
      <CustomerPicker userId={user.id} visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(c: Customer) => { setCustomerId(c.id); setCustomerName(c.name); }} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
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
