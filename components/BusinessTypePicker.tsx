import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { BUSINESS_TYPES } from '@/lib/terminology';
import type { BusinessType } from '@/types/database';

type BusinessTypePickerProps = {
  value: BusinessType | null;
  onChange: (type: BusinessType) => void;
};

export function BusinessTypePicker({ value, onChange }: BusinessTypePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = BUSINESS_TYPES.find((t) => t.id === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{selected?.label ?? 'Select business type'}</Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Business type</Text>
            <ScrollView>
              {BUSINESS_TYPES.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.row, value === item.id && styles.rowSelected]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowLabel, value === item.id && styles.rowLabelSelected]}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

type BusinessTypeGateProps = {
  onSelect: (type: BusinessType) => void;
  saving?: boolean;
};

export function BusinessTypeGate({ onSelect, saving }: BusinessTypeGateProps) {
  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>What type of business are you?</Text>
      <Text style={styles.gateHint}>Pick one to unlock your client list. You can change this later on Home.</Text>
      <BusinessTypePicker value={null} onChange={onSelect} />
      {saving ? <Text style={styles.saving}>Saving…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  triggerText: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '600' },
  chevron: { ...typography.caption, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: spacing.md,
  },
  sheetTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowSelected: { backgroundColor: colors.surfaceElevated },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowLabelSelected: { color: colors.textPrimary, fontWeight: '700' },
  gate: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  gateTitle: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  gateHint: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  saving: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
