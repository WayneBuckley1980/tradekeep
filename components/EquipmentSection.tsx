import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { formatDisplayDate } from '@/lib/dates';
import { createEquipment, deleteEquipment, fetchEquipmentForCustomer } from '@/lib/equipment';
import type { Equipment } from '@/types/database';

type EquipmentSectionProps = {
  userId: string;
  customerId: string;
};

export function EquipmentSection({ userId, customerId }: EquipmentSectionProps) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');

  const load = async () => {
    setItems(await fetchEquipmentForCustomer(userId, customerId));
  };

  useEffect(() => {
    load().catch(console.error);
  }, [userId, customerId]);

  const add = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter equipment name (e.g. Boiler).');
      return;
    }
    await createEquipment(userId, {
      customer_id: customerId,
      property_id: null,
      name: name.trim(),
      make_model: null,
      serial_number: serial.trim() || null,
      installed_at: null,
      warranty_until: null,
      last_service_at: null,
      next_service_at: null,
      notes: null,
    });
    setName('');
    setSerial('');
    await load();
  };

  const remove = (item: Equipment) => {
    Alert.alert('Remove equipment', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEquipment(userId, item.id);
          await load();
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Equipment register</Text>
      {items.length === 0 ? (
        <Text style={styles.meta}>No equipment logged yet.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.serial_number ? <Text style={styles.meta}>Serial: {item.serial_number}</Text> : null}
              {item.next_service_at ? (
                <Text style={styles.meta}>Next service: {formatDisplayDate(item.next_service_at)}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => remove(item)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
      <TextInput
        style={[styles.input, styles.spaced]}
        value={name}
        onChangeText={setName}
        placeholder="Equipment name"
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={[styles.input, styles.spaced]}
        value={serial}
        onChangeText={setSerial}
        placeholder="Serial number (optional)"
        placeholderTextColor={colors.textMuted}
      />
      <Pressable style={styles.btn} onPress={add}>
        <Text style={styles.btnText}>+ Add equipment</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  rowBody: { flex: 1 },
  itemName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  remove: { ...typography.caption, color: colors.statusOverdue },
  input: { ...inputStyle },
  spaced: { marginTop: spacing.sm },
  btn: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.sm, alignItems: 'center' },
  btnText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
});
