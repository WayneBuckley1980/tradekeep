import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { BUSINESS_TYPES } from '@/lib/terminology';
import type { BusinessType } from '@/types/database';

type BusinessTypePickerProps = {
  value: BusinessType | null;
  onChange: (type: BusinessType) => void;
  compact?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    compactCard: {
      marginRight: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    compactRow: { paddingVertical: spacing.xs },
    selected: { borderColor: colors.textPrimary, borderWidth: 2 },
    icon: { fontSize: 22 },
    label: { ...typography.body, color: colors.textSecondary, fontWeight: '600', flex: 1 },
    labelSelected: { color: colors.textPrimary },
    gate: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
    gateTitle: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
    gateHint: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
    saving: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  });
}

export function BusinessTypePicker({ value, onChange, compact }: BusinessTypePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal={compact}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={compact ? styles.compactRow : undefined}
    >
      {BUSINESS_TYPES.map((item) => (
        <Pressable key={item.id} onPress={() => onChange(item.id)}>
          <Card
            style={StyleSheet.flatten([
              compact ? styles.compactCard : styles.card,
              value === item.id && styles.selected,
            ])}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, value === item.id && styles.labelSelected]}>{item.label}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

type BusinessTypeGateProps = {
  onSelect: (type: BusinessType) => void;
  saving?: boolean;
};

export function BusinessTypeGate({ onSelect, saving }: BusinessTypeGateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>What type of business are you?</Text>
      <Text style={styles.gateHint}>Pick one to unlock your client list. You can change this later in Settings.</Text>
      <BusinessTypePicker value={null} onChange={onSelect} />
      {saving ? <Text style={styles.saving}>Saving…</Text> : null}
    </View>
  );
}
