import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import {
  formatDateOnly,
  parseDateOnly,
} from '@/lib/dates';
import type { Customer } from '@/types/database';

export type CustomerFormValues = {
  name: string;
  notes: string;
  last_appointment: string | null;
  amount_paid: string;
  follow_up_at: string | null;
};

type CustomerFormProps = {
  initial?: Partial<Customer>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  submitLabel?: string;
};

function toFormValues(initial?: Partial<Customer>): CustomerFormValues {
  return {
    name: initial?.name ?? '',
    notes: initial?.notes ?? '',
    last_appointment: initial?.last_appointment ?? null,
    amount_paid: initial?.amount_paid != null ? String(initial.amount_paid) : '',
    follow_up_at: initial?.follow_up_at ?? null,
  };
}

export function CustomerForm({ initial, onSubmit, submitLabel = 'Save client' }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [showLastPicker, setShowLastPicker] = useState(false);
  const [showFollowPicker, setShowFollowPicker] = useState(false);

  const update = (patch: Partial<CustomerFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async () => {
    if (!values.name.trim()) {
      Alert.alert('Name required', 'Please enter a client name.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const renderDateField = (
    label: string,
    value: string | null,
    onChange: (date: string | null) => void,
    showPicker: boolean,
    setShowPicker: (show: boolean) => void,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>
          {value ? parseDateOnly(value)?.toLocaleDateString('en-GB') : 'Not set'}
        </Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={parseDateOnly(value) ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          onChange={(_event, date) => {
            if (Platform.OS !== 'ios') setShowPicker(false);
            if (date) onChange(formatDateOnly(date));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && showPicker ? (
        <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Client name *</Text>
        <TextInput
          style={styles.input}
          value={values.name}
          onChangeText={(name) => update({ name })}
          placeholder="e.g. Jamie"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes / preferences</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={values.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder="Likes skin fade #2, allergic to product X"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </View>

      {renderDateField(
        'Last appointment',
        values.last_appointment,
        (last_appointment) => update({ last_appointment }),
        showLastPicker,
        setShowLastPicker,
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Amount paid (£)</Text>
        <TextInput
          style={styles.input}
          value={values.amount_paid}
          onChangeText={(amount_paid) => update({ amount_paid })}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </View>

      {renderDateField(
        'Follow-up reminder',
        values.follow_up_at,
        (follow_up_at) => update({ follow_up_at }),
        showFollowPicker,
        setShowFollowPicker,
      )}

      <Pressable
        style={[styles.submit, saving && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={styles.submitText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    ...inputStyle,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    ...inputStyle,
    justifyContent: 'center',
  },
  dateText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  doneText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  submit: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    ...typography.label,
    color: colors.ctaText,
    fontWeight: '700',
  },
});
