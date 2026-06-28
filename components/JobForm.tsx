import { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { CustomerPicker } from '@/components/CustomerPicker';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { fetchJobTemplates } from '@/lib/templates';
import type { Customer, JobStatus, JobTemplate } from '@/types/database';

export type JobFormValues = {
  customer_id: string;
  title: string;
  description: string;
  scheduled_at: Date;
  duration_minutes: string;
  address_line1: string;
  city: string;
  postcode: string;
  status: JobStatus;
  price: string;
  materials: string;
  notes: string;
};

type JobFormProps = {
  userId: string;
  initial?: Partial<JobFormValues>;
  onSubmit: (values: JobFormValues) => Promise<void>;
  submitLabel?: string;
};

const STATUSES: JobStatus[] = ['upcoming', 'in_progress', 'completed', 'cancelled'];

export function JobForm({ userId, initial, onSubmit, submitLabel = 'Save job' }: JobFormProps) {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [values, setValues] = useState<JobFormValues>({
    customer_id: initial?.customer_id ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    scheduled_at: initial?.scheduled_at ?? new Date(),
    duration_minutes: initial?.duration_minutes ?? '',
    address_line1: initial?.address_line1 ?? '',
    city: initial?.city ?? '',
    postcode: initial?.postcode ?? '',
    status: initial?.status ?? 'upcoming',
    price: initial?.price ?? '',
    materials: initial?.materials ?? '',
    notes: initial?.notes ?? '',
  });
  const [customerName, setCustomerName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJobTemplates(userId).then(setTemplates).catch(console.error);
  }, [userId]);

  const applyTemplate = (template: JobTemplate) => {
    setValues((v) => ({
      ...v,
      title: template.title,
      description: template.description ?? v.description,
      duration_minutes: template.duration_minutes?.toString() ?? v.duration_minutes,
      materials: template.materials ?? v.materials,
      price: template.suggested_price?.toString() ?? v.price,
    }));
  };

  const handleSubmit = async () => {
    if (!values.customer_id || !values.title.trim()) {
      Alert.alert('Required', 'Select a client and enter a job title.');
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

  return (
    <>
      <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
        {templates.length > 0 ? (
          <View style={styles.templateSection}>
            <Text style={styles.templateLabel}>Choose template</Text>
            <View style={styles.templateRow}>
              {templates.map((t) => (
                <Pressable key={t.id} style={styles.templateChip} onPress={() => applyTemplate(t)}>
                  <Text style={styles.templateText}>{t.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
          <Text style={values.customer_id ? styles.inputText : styles.placeholder}>
            {customerName || 'Select client *'}
          </Text>
        </Pressable>

        <TextInput style={styles.input} value={values.title} onChangeText={(title) => setValues((v) => ({ ...v, title }))} placeholder="Job title *" placeholderTextColor={colors.textMuted} />
        <TextInput style={[styles.input, styles.multiline]} value={values.description} onChangeText={(description) => setValues((v) => ({ ...v, description }))} placeholder="Description" placeholderTextColor={colors.textMuted} multiline />

        <Pressable style={styles.input} onPress={() => setShowDate(true)}>
          <Text style={styles.inputText}>{values.scheduled_at.toLocaleString('en-GB')}</Text>
        </Pressable>
        {showDate ? (
          <>
            <DateTimePicker value={values.scheduled_at} mode="datetime" themeVariant="dark" onChange={(_e, d) => d && setValues((v) => ({ ...v, scheduled_at: d }))} />
            {Platform.OS === 'ios' ? (
              <Pressable onPress={() => setShowDate(false)}><Text style={styles.done}>Done</Text></Pressable>
            ) : null}
          </>
        ) : null}

        <TextInput style={styles.input} value={values.duration_minutes} onChangeText={(duration_minutes) => setValues((v) => ({ ...v, duration_minutes }))} placeholder="Duration (minutes)" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
        <TextInput style={styles.input} value={values.address_line1} onChangeText={(address_line1) => setValues((v) => ({ ...v, address_line1 }))} placeholder="Job address" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} value={values.price} onChangeText={(price) => setValues((v) => ({ ...v, price }))} placeholder="Price (£)" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
        <TextInput style={styles.input} value={values.materials} onChangeText={(materials) => setValues((v) => ({ ...v, materials }))} placeholder="Materials" placeholderTextColor={colors.textMuted} />
        <TextInput style={[styles.input, styles.multiline]} value={values.notes} onChangeText={(notes) => setValues((v) => ({ ...v, notes }))} placeholder="Notes" placeholderTextColor={colors.textMuted} multiline />

        <View style={styles.statusRow}>
          {STATUSES.map((status) => (
            <Pressable key={status} style={[styles.statusChip, values.status === status && styles.statusActive]} onPress={() => setValues((v) => ({ ...v, status }))}>
              <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.submit, saving && styles.disabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? 'Saving…' : submitLabel}</Text>
        </Pressable>
      </KeyboardSafeScroll>

      <CustomerPicker
        userId={userId}
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c: Customer) => {
          setValues((v) => ({
            ...v,
            customer_id: c.id,
            address_line1: v.address_line1 || c.address_line1 || '',
            city: v.city || c.city || '',
            postcode: v.postcode || c.postcode || '',
          }));
          setCustomerName(c.name);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  templateSection: { marginBottom: spacing.md },
  templateLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  templateChip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  templateText: { ...typography.caption, color: colors.textPrimary },
  input: { ...inputStyle, marginBottom: spacing.sm, justifyContent: 'center' },
  inputText: { color: colors.textPrimary, fontSize: 16 },
  placeholder: { color: colors.textMuted, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  done: { color: colors.textPrimary, textAlign: 'right', marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  statusChip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  statusActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  statusText: { ...typography.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  submit: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  submitText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
