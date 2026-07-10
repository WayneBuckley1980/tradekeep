import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDateOnly, parseDateOnly } from '@/lib/dates';
import { REMINDER_PRESETS, computeFollowUpDate } from '@/lib/reminders';
import type { Customer, ReminderType } from '@/types/database';

export type CustomerFormValues = {
  name: string;
  notes: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  is_favourite: boolean;
  next_action: string;
  next_action_due_at: string | null;
  last_appointment: string | null;
  amount_paid: string;
  follow_up_at: string | null;
  reminder_type: ReminderType;
  reminder_offset_days: string;
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
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address_line1: initial?.address_line1 ?? '',
    address_line2: initial?.address_line2 ?? '',
    city: initial?.city ?? '',
    postcode: initial?.postcode ?? '',
    is_favourite: initial?.is_favourite ?? false,
    next_action: initial?.next_action ?? '',
    next_action_due_at: initial?.next_action_due_at ?? null,
    last_appointment: initial?.last_appointment ?? null,
    amount_paid: initial?.amount_paid != null ? String(initial.amount_paid) : '',
    follow_up_at: initial?.follow_up_at ?? null,
    reminder_type: initial?.reminder_type ?? 'fixed_date',
    reminder_offset_days: initial?.reminder_offset_days != null ? String(initial.reminder_offset_days) : '365',
  };
}

export function CustomerForm({ initial, onSubmit, submitLabel = 'Save client' }: CustomerFormProps) {
  const terms = useTerminology();
  const [values, setValues] = useState<CustomerFormValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [datePicker, setDatePicker] = useState<'last' | 'follow' | 'next' | null>(null);

  const update = (patch: Partial<CustomerFormValues>) => setValues((c) => ({ ...c, ...patch }));

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
    key: 'last' | 'follow' | 'next',
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateButton} onPress={() => setDatePicker(key)}>
        <Text style={styles.dateText}>
          {value ? parseDateOnly(value)?.toLocaleDateString('en-GB') : 'Not set'}
        </Text>
      </Pressable>
      {datePicker === key ? (
        <>
          <DateTimePicker
            value={parseDateOnly(value) ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            onChange={(_event, date) => {
              if (Platform.OS !== 'ios') setDatePicker(null);
              if (date) onChange(formatDateOnly(date));
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable style={styles.doneButton} onPress={() => setDatePicker(null)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
      <View style={styles.field}>
        <Text style={styles.label}>Client name *</Text>
        <TextInput style={styles.input} value={values.name} onChangeText={(name) => update({ name })} placeholder="e.g. Jamie" placeholderTextColor={colors.textMuted} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={values.phone} onChangeText={(phone) => update({ phone })} placeholder="07…" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={values.email} onChangeText={(email) => update({ email })} placeholder="client@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={values.address_line1} onChangeText={(address_line1) => update({ address_line1 })} placeholder="Street" placeholderTextColor={colors.textMuted} />
        <TextInput style={[styles.input, styles.spacedInput]} value={values.city} onChangeText={(city) => update({ city })} placeholder="City" placeholderTextColor={colors.textMuted} />
        <TextInput style={[styles.input, styles.spacedInput]} value={values.postcode} onChangeText={(postcode) => update({ postcode })} placeholder="Postcode" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes / preferences</Text>
        <TextInput style={[styles.input, styles.notesInput]} value={values.notes} onChangeText={(notes) => update({ notes })} placeholder={terms.clientNotesExample} placeholderTextColor={colors.textMuted} multiline />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Favourite ⭐</Text>
        <Switch value={values.is_favourite} onValueChange={(is_favourite) => update({ is_favourite })} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Next action</Text>
        <TextInput style={styles.input} value={values.next_action} onChangeText={(next_action) => update({ next_action })} placeholder="Call, send quote, chase invoice…" placeholderTextColor={colors.textMuted} />
      </View>
      {renderDateField('Next action due', values.next_action_due_at, (next_action_due_at) => update({ next_action_due_at }), 'next')}

      {renderDateField('Last appointment', values.last_appointment, (last_appointment) => update({ last_appointment }), 'last')}

      <View style={styles.field}>
        <Text style={styles.label}>Amount paid (£)</Text>
        <TextInput style={styles.input} value={values.amount_paid} onChangeText={(amount_paid) => update({ amount_paid })} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
      </View>

      {renderDateField('Follow-up reminder', values.follow_up_at, (follow_up_at) => update({ follow_up_at }), 'follow')}

      <View style={styles.field}>
        <Text style={styles.label}>Reminder type</Text>
        <View style={styles.chipRow}>
          {REMINDER_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              style={[styles.chip, values.reminder_type === preset.id && styles.chipActive]}
              onPress={() => {
                const follow_up_at = computeFollowUpDate(preset.id, {
                  fixedDate: values.follow_up_at,
                  offsetDays: Number(values.reminder_offset_days) || null,
                  referenceDate: values.last_appointment,
                });
                update({
                  reminder_type: preset.id,
                  follow_up_at: follow_up_at ?? values.follow_up_at,
                });
              }}
            >
              <Text style={styles.chipText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {values.reminder_type === 'days_after_install' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Days after install</Text>
          <TextInput
            style={styles.input}
            value={values.reminder_offset_days}
            onChangeText={(reminder_offset_days) => {
              const days = Number(reminder_offset_days);
              update({
                reminder_offset_days,
                follow_up_at: computeFollowUpDate('days_after_install', {
                  offsetDays: Number.isFinite(days) ? days : null,
                  referenceDate: values.last_appointment,
                }),
              });
            }}
            keyboardType="number-pad"
            placeholder="365"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ) : null}

      <Pressable style={[styles.submit, saving && styles.submitDisabled]} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { ...inputStyle },
  spacedInput: { marginTop: spacing.sm },
  notesInput: { minHeight: 100, textAlignVertical: 'top' },
  dateButton: { ...inputStyle, justifyContent: 'center' },
  dateText: { color: colors.textPrimary, fontSize: 16 },
  doneButton: { alignSelf: 'flex-end', marginTop: spacing.xs },
  doneText: { color: colors.textPrimary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  chipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  chipText: { ...typography.caption, color: colors.textPrimary },
  submit: { backgroundColor: colors.ctaBackground, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
