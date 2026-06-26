import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { fetchCustomers } from '@/lib/customers';
import type { Customer } from '@/types/database';

type CustomerPickerProps = {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
};

export function CustomerPicker({ userId, visible, onClose, onSelect }: CustomerPickerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const load = useCallback(async () => {
    const data = await fetchCustomers(userId);
    setCustomers(data);
  }, [userId]);

  useEffect(() => {
    if (visible) load().catch(console.error);
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Select client</Text>
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
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
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  row: { ...inputStyle, marginBottom: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  cancel: { padding: spacing.md, alignItems: 'center' },
  cancelText: { ...typography.body, color: colors.textSecondary },
});
