import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useTerminology } from '@/hooks/useTerminology';
import { defaultLineItems, type QuoteLineItemDraft } from '@/lib/quoteItems';
import { QUOTE_DURATION_UNITS } from '@/lib/terminology';
import type { BusinessType, QuoteDurationUnit } from '@/types/database';

type QuoteLineItemsFormProps = {
  items: QuoteLineItemDraft[];
  onChange: (items: QuoteLineItemDraft[]) => void;
  discount: string;
  onDiscountChange: (value: string) => void;
};

export function QuoteLineItemsForm({ items, onChange, discount, onDiscountChange }: QuoteLineItemsFormProps) {
  const terms = useTerminology();

  const updateItem = (index: number, patch: Partial<QuoteLineItemDraft>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addRow = () =>
    onChange([
      ...items,
      { label: '', amount: '', durationQty: '', durationUnit: terms.defaultDurationUnit },
    ]);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{terms.quote} breakdown</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemBlock}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.labelInput]}
              value={item.label}
              onChangeText={(v) => updateItem(index, { label: v })}
              placeholder="Service or item"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={item.amount}
              onChangeText={(v) => updateItem(index, { amount: v })}
              placeholder="£"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Duration</Text>
            <TextInput
              style={[styles.input, styles.durationQty]}
              value={item.durationQty}
              onChangeText={(v) => updateItem(index, { durationQty: v })}
              placeholder="Qty"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitRow}>
              {QUOTE_DURATION_UNITS.map((unit) => (
                <Pressable
                  key={unit.id}
                  style={[styles.unitChip, item.durationUnit === unit.id && styles.unitChipActive]}
                  onPress={() => updateItem(index, { durationUnit: unit.id as QuoteDurationUnit })}
                >
                  <Text style={[styles.unitText, item.durationUnit === unit.id && styles.unitTextActive]}>
                    {unit.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
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

export function useQuoteLineItemsState(businessType?: BusinessType | null) {
  const [items, setItems] = useState(() => defaultLineItems(businessType));
  const [discount, setDiscount] = useState('');
  return { items, setItems, discount, setDiscount };
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  title: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  itemBlock: { marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  durationRow: { gap: spacing.xs },
  durationLabel: { ...typography.caption, color: colors.textMuted },
  durationQty: { width: 72 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  unitChip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  unitChipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  unitText: { ...typography.caption, color: colors.textMuted },
  unitTextActive: { color: colors.textPrimary, fontWeight: '600' },
  input: { ...inputStyle },
  labelInput: { flex: 1 },
  amountInput: { width: 100 },
  addRow: { ...typography.caption, color: colors.textPrimary, marginBottom: spacing.md, fontWeight: '600' },
  discountLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  totalLabel: { ...typography.heading, color: colors.textPrimary },
  totalValue: { ...typography.heading, color: colors.textPrimary, fontWeight: '700' },
});
