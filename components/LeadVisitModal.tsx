import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { pipelineErrorMessage } from '@/lib/jobPipeline';
import { saveVisitPlan } from '@/lib/jobWorkflow';
import { createJob, generateJobReference } from '@/lib/jobs';
import type { Customer, Job } from '@/types/database';

type LeadVisitModalProps = {
  visible: boolean;
  customer: Customer;
  userId: string;
  leadJob: Job | null;
  onClose: () => void;
  onContinueToQuote: (jobId?: string) => void;
  onSaved: () => void;
};

export function LeadVisitModal({
  visible,
  customer,
  userId,
  leadJob,
  onClose,
  onContinueToQuote,
  onSaved,
}: LeadVisitModalProps) {
  const [visitRequired, setVisitRequired] = useState<boolean | null>(null);
  const [visitAt, setVisitAt] = useState(new Date());
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setVisitRequired(leadJob?.visit_required ?? null);
    setVisitAt(leadJob?.visit_at ? new Date(leadJob.visit_at) : new Date());
    setAddToCalendar(true);
    setShowDatePicker(false);
  }, [visible, leadJob]);

  const ensureLeadJob = async (): Promise<Job> => {
    if (leadJob) return leadJob;
    const scheduled = new Date();
    scheduled.setHours(9, 0, 0, 0);
    return createJob(userId, {
      customer_id: customer.id,
      reference: generateJobReference(),
      title: `Enquiry — ${customer.name}`,
      description: null,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: null,
      address_line1: customer.address_line1,
      city: customer.city,
      postcode: customer.postcode,
      status: 'upcoming',
      pipeline_status: 'lead',
      price: null,
      materials: null,
      notes: null,
      visit_required: null,
      visit_at: null,
      start_at: null,
      work_completed_notes: null,
      additional_works: null,
      additional_materials: null,
      deleted_at: null,
      job_notification_ids: null,
      quote_id: null,
      property_id: null,
    });
  };

  const visitAtIso = () => {
    const d = new Date(visitAt);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  };

  const handleNoVisit = async () => {
    setBusy(true);
    try {
      const job = await ensureLeadJob();
      await saveVisitPlan(userId, job, false, null, false, customer);
      onClose();
      onContinueToQuote(job.id);
    } catch (error) {
      Alert.alert('Could not continue', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveVisit = async () => {
    setBusy(true);
    try {
      const job = await ensureLeadJob();
      await saveVisitPlan(userId, job, true, visitAtIso(), addToCalendar, customer);
      onSaved();
      onClose();
      Alert.alert('Visit saved', addToCalendar ? 'Visit added to your calendar.' : 'Visit date saved.');
    } catch (error) {
      Alert.alert('Could not save visit', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Visit required before quote?</Text>
          <Text style={styles.subtitle}>Choose whether you need to visit this client before sending a quote.</Text>

          <Text style={styles.label}>Visit required?</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, visitRequired === true && styles.chipActive]}
              onPress={() => setVisitRequired(true)}
            >
              <Text style={[styles.chipText, visitRequired === true && styles.chipTextActive]}>Yes</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, visitRequired === false && styles.chipActive]}
              onPress={() => setVisitRequired(false)}
            >
              <Text style={[styles.chipText, visitRequired === false && styles.chipTextActive]}>No</Text>
            </Pressable>
          </View>

          {visitRequired === true ? (
            <>
              <Text style={styles.label}>Visit date</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateText}>
                  {visitAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Pressable>
              {showDatePicker ? (
                <>
                  <DateTimePicker
                    value={visitAt}
                    mode="date"
                    themeVariant="dark"
                    onChange={(_e, d) => d && setVisitAt(d)}
                  />
                  {Platform.OS === 'ios' ? (
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.done}>Done</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              <View style={styles.switchRow}>
                <Text style={styles.label}>Add to calendar</Text>
                <Switch value={addToCalendar} onValueChange={setAddToCalendar} />
              </View>
              <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleSaveVisit}>
                {busy ? <ActivityIndicator color={colors.ctaText} /> : <Text style={styles.btnText}>Save visit</Text>}
              </Pressable>
            </>
          ) : null}

          {visitRequired === false ? (
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleNoVisit}>
              {busy ? <ActivityIndicator color={colors.ctaText} /> : <Text style={styles.btnText}>Continue to quote</Text>}
            </Pressable>
          ) : null}

          <Pressable style={styles.cancel} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  chipText: { ...typography.body, color: colors.textMuted },
  chipTextActive: { color: colors.textPrimary, fontWeight: '600' },
  dateInput: { ...inputStyle, justifyContent: 'center', marginBottom: spacing.sm },
  dateText: { ...typography.body, color: colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
  btn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  done: { ...typography.body, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing.sm },
  cancel: { alignItems: 'center', paddingTop: spacing.md },
  cancelText: { ...typography.body, color: colors.textMuted },
});
