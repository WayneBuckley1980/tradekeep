import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { defaultLineItems } from '@/lib/quoteItems';

type LineItemRow = { label: string; amount: string };

type QuoteLineItemsFormProps = {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  discount: string;
  onDiscountChange: (value: string) => void;
};

export function QuoteLineItemsForm({ items, onChange, discount, onDiscountChange }: QuoteLineItemsFormProps) {
  const updateItem = (index: number, field: 'label' | 'amount', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addRow = () => onChange([...items, { label: '', amount: '' }]);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Quote breakdown</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            style={[styles.input, styles.labelInput]}
            value={item.label}
            onChangeText={(v) => updateItem(index, 'label', v)}
            placeholder="Item"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={item.amount}
            onChangeText={(v) => updateItem(index, 'amount', v)}
            placeholder="£"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      ))}
      <Pressable onPress={addRow}>
        <Text style={styles.addRow}>+ Add line</Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.discountLabel}>Discount</Text>
        <TextInput
          style={[styles.input, styles.amountInput]}
          value={discount}
          onChangeText={onDiscountChange}
          placeholder="£"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>£{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export function useQuoteLineItemsState() {
  const [items, setItems] = useState(defaultLineItems());
  const [discount, setDiscount] = useState('');
  return { items, setItems, discount, setDiscount };
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  title: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  input: { ...inputStyle },
  labelInput: { flex: 1 },
  amountInput: { width: 100 },
  addRow: { ...typography.caption, color: colors.textPrimary, marginBottom: spacing.md, fontWeight: '600' },
  discountLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  totalLabel: { ...typography.heading, color: colors.textPrimary },
  totalValue: { ...typography.heading, color: colors.textPrimary, fontWeight: '700' },
});
