import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import { fetchUninvoicedQuotesForCustomer } from '@/lib/quotes';
import type { Quote } from '@/types/database';

type QuotePickerProps = {
  userId: string;
  customerId: string;
  jobId?: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (quote: Quote | null) => void;
};

export function QuotePicker({ userId, customerId, jobId, visible, onClose, onSelect }: QuotePickerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    if (!customerId) {
      setQuotes([]);
      return;
    }
    const data = await fetchUninvoicedQuotesForCustomer(userId, customerId, jobId);
    setQuotes(data);
  }, [userId, customerId, jobId]);

  useEffect(() => {
    if (visible) load().catch(console.error);
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Link to quote</Text>
        <Text style={styles.subtitle}>Optional — pick which quote this invoice relates to</Text>
        <Pressable
          style={styles.row}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        >
          <Text style={styles.name}>No linked quote</Text>
        </Pressable>
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No uninvoiced quotes for this client</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.name}>{item.reference ?? item.title}</Text>
              <Text style={styles.sub}>
                {item.reference ? item.title : null}
                {item.reference ? ' · ' : ''}
                {formatMoney(Number(item.amount))}
              </Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  row: { ...inputStyle, marginBottom: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.caption, color: colors.textMuted, marginVertical: spacing.md },
  cancel: { padding: spacing.md, alignItems: 'center' },
  cancelText: { ...typography.body, color: colors.textSecondary },
});
