import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { AttachmentGallery } from '@/components/AttachmentGallery';
import { Card } from '@/components/Card';
import { JobProgressBar } from '@/components/JobProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { VoiceNotesSection } from '@/components/VoiceNotesSection';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import {
  deleteAttachment,
  fetchAttachmentsForJob,
  uploadAttachment,
} from '@/lib/attachments';
import { fetchCustomer } from '@/lib/customers';
import { fetchInvoiceForJob } from '@/lib/invoices';
import { PIPELINE_LABELS, pipelineErrorMessage } from '@/lib/jobPipeline';
import { fetchQuotesForCustomer } from '@/lib/quotes';
import { raiseInvoiceForJob, reconcileJobPipeline, rescheduleJobStart, saveVisitPlan } from '@/lib/jobWorkflow';
import { deleteJob, duplicateJob, fetchJob, formatJobDateTime, updateJob } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { linkJobToProperty } from '@/lib/properties';
import type { Attachment, Customer, Invoice, Job } from '@/types/database';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const terms = useTerminology();
  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [jobInvoice, setJobInvoice] = useState<Invoice | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [visitRequired, setVisitRequired] = useState<boolean | null>(null);
  const [visitAt, setVisitAt] = useState(new Date());
  const [addVisitToCalendar, setAddVisitToCalendar] = useState(false);
  const [showVisitPicker, setShowVisitPicker] = useState(false);

  const [workCompletedNotes, setWorkCompletedNotes] = useState('');
  const [additionalWorks, setAdditionalWorks] = useState('');
  const [additionalMaterials, setAdditionalMaterials] = useState('');

  const [startAt, setStartAt] = useState(new Date());
  const [addStartToCalendar, setAddStartToCalendar] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);

  const syncFormFromJob = (data: Job) => {
    setVisitRequired(data.visit_required);
    setVisitAt(data.visit_at ? new Date(data.visit_at) : new Date());
    setWorkCompletedNotes(data.work_completed_notes ?? '');
    setAdditionalWorks(data.additional_works ?? '');
    setAdditionalMaterials(data.additional_materials ?? '');
    setStartAt(data.start_at ? new Date(data.start_at) : new Date(data.scheduled_at));
  };

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    let data = await fetchJob(user.id, id);
    if (data) {
      const quotes = await fetchQuotesForCustomer(user.id, data.customer_id);
      data = await reconcileJobPipeline(user.id, data, quotes);
    }
    setJob(data);
    if (data) {
      syncFormFromJob(data);
      const [fetchedCustomer, invoice] = await Promise.all([
        fetchCustomer(user.id, data.customer_id),
        fetchInvoiceForJob(user.id, data.id),
      ]);
      setCustomer(fetchedCustomer);
      setCustomerName(fetchedCustomer?.name ?? '');
      setJobInvoice(invoice);
      if (fetchedCustomer) {
        await linkJobToProperty(user.id, data, fetchedCustomer);
      }
      setAttachments(await fetchAttachmentsForJob(user.id, data.id));
    }
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().catch(console.error).finally(() => setLoading(false));
    }, [load]),
  );

  const addPhoto = async (kind: 'photo_before' | 'photo_after') => {
    if (!user?.id || !job) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach before/after photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      await uploadAttachment(user.id, {
        uri: result.assets[0].uri,
        kind,
        customerId: job.customer_id,
        jobId: job.id,
        fileName: result.assets[0].fileName ?? 'photo.jpg',
      });
      setAttachments(await fetchAttachmentsForJob(user.id, job.id));
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (attachment: Attachment) => {
    if (!user?.id) return;
    Alert.alert('Remove photo', 'Delete this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAttachment(user.id!, attachment);
          if (job) setAttachments(await fetchAttachmentsForJob(user.id!, job.id));
        },
      },
    ]);
  };

  const openCreateQuote = () => {
    if (!job) return;
    router.push({ pathname: '/quote/new', params: { jobId: job.id } });
  };

  const goToQuote = () => {
    if (!job?.quote_id) return;
    router.push(`/quote/${job.quote_id}`);
  };

  const handleContinueToQuote = async () => {
    if (!user?.id || !job) return;
    setBusy(true);
    try {
      const required = visitRequired ?? false;
      await saveVisitPlan(
        user.id,
        job,
        required,
        required ? visitAt.toISOString() : null,
        addVisitToCalendar,
        customer ?? undefined,
      );
      if (job.quote_id) {
        router.push(`/quote/${job.quote_id}`);
      } else {
        router.push({ pathname: '/quote/new', params: { jobId: job.id } });
      }
    } catch (error) {
      Alert.alert('Could not save visit plan', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const saveWorkCompletion = async () => {
    if (!user?.id || !job) return;
    setBusy(true);
    try {
      const updated = await updateJob(user.id, job.id, {
        work_completed_notes: workCompletedNotes.trim() || null,
        additional_works: additionalWorks.trim() || null,
        additional_materials: additionalMaterials.trim() || null,
      });
      setJob(updated);
      Alert.alert('Saved', 'Work completion notes updated.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleRescheduleStart = async () => {
    if (!user?.id || !job) return;
    setBusy(true);
    try {
      const updated = await rescheduleJobStart(
        user.id,
        job,
        startAt.toISOString(),
        addStartToCalendar,
        customer ?? undefined,
      );
      setJob(updated);
      syncFormFromJob(updated);
      Alert.alert('Rescheduled', 'Job start date updated.');
    } catch (error) {
      Alert.alert('Could not reschedule', pipelineErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openCreateInvoice = async () => {
    if (!user?.id || !job || !profile) return;
    if (jobInvoice) {
      router.push(`/invoice/${jobInvoice.id}`);
      return;
    }
    if (job.pipeline_status !== 'active' && job.pipeline_status !== 'quoted') {
      Alert.alert(
        'Not ready to invoice',
        job.pipeline_status === 'invoiced' || job.pipeline_status === 'complete'
          ? 'This job has already been invoiced.'
          : 'Send and accept a quote first so the job is Active, then raise the invoice.',
      );
      return;
    }
    const client = customer ?? (await fetchCustomer(user.id, job.customer_id));
    if (!client) return;
    try {
      const invoice = await raiseInvoiceForJob(user.id, profile, client, job, {
        customer_id: job.customer_id,
        quote_id: job.quote_id,
        reference: null,
        title: job.title,
        amount: job.price ?? 0,
        status: 'sent',
        due_at: null,
      });
      Alert.alert('Invoice raised', 'Invoice saved. Open the invoice to email or record payment.');
      load();
      router.push(`/invoice/${invoice.id}`);
    } catch (error) {
      Alert.alert('Could not raise invoice', pipelineErrorMessage(error));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete job', 'Move this job to Archived?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !job) return;
          await deleteJob(user.id, job.id);
          Alert.alert('Job moved to Archived');
          router.back();
        },
      },
    ]);
  };

  if (loading || !job) {
    return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;
  }

  const isLead = job.pipeline_status === 'lead';
  const isActive = job.pipeline_status === 'active';
  const canInvoice = job.pipeline_status === 'active' || job.pipeline_status === 'quoted';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <JobProgressBar currentStatus={job.pipeline_status} />
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <StatusBadge label={PIPELINE_LABELS[job.pipeline_status]} status={job.pipeline_status} />
      </View>
      {job.reference ? <Text style={styles.meta}>{job.reference}</Text> : null}
      <Text style={styles.meta}>{formatJobDateTime(job.scheduled_at)}</Text>
      {job.start_at ? <Text style={styles.meta}>Start: {formatJobDateTime(job.start_at)}</Text> : null}
      {job.visit_at ? <Text style={styles.meta}>Visit: {formatJobDateTime(job.visit_at)}</Text> : null}
      <Text style={styles.meta}>{customerName}</Text>
      {job.price != null ? <Text style={styles.price}>{formatMoney(Number(job.price))}</Text> : null}

      <Card style={styles.card}>
        {job.description ? <Text style={styles.body}>{job.description}</Text> : null}
        {job.materials ? <Text style={styles.meta}>{terms.materials}: {job.materials}</Text> : null}
        {job.notes ? <Text style={styles.meta}>Notes: {job.notes}</Text> : null}
        {job.address_line1 ? <Text style={styles.meta}>{[job.address_line1, job.city, job.postcode].filter(Boolean).join(', ')}</Text> : null}
      </Card>

      {isLead ? (
        <Card style={styles.card}>
          <Text style={styles.section}>Site visit</Text>
          <Text style={styles.label}>Visit required?</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.chip, visitRequired === true && styles.chipActive]}
              onPress={() => setVisitRequired(true)}
            >
              <Text style={styles.chipText}>Yes</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, visitRequired === false && styles.chipActive]}
              onPress={() => setVisitRequired(false)}
            >
              <Text style={styles.chipText}>No</Text>
            </Pressable>
          </View>

          {visitRequired ? (
            <>
              <Pressable style={styles.input} onPress={() => setShowVisitPicker(true)}>
                <Text style={styles.inputText}>{visitAt.toLocaleString('en-GB')}</Text>
              </Pressable>
              {showVisitPicker ? (
                <>
                  <DateTimePicker
                    value={visitAt}
                    mode="datetime"
                    themeVariant="dark"
                    onChange={(_e, d) => d && setVisitAt(d)}
                  />
                  {Platform.OS === 'ios' ? (
                    <Pressable onPress={() => setShowVisitPicker(false)}>
                      <Text style={styles.done}>Done</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              <View style={styles.switchRow}>
                <Text style={styles.label}>Add to calendar</Text>
                <Switch value={addVisitToCalendar} onValueChange={setAddVisitToCalendar} />
              </View>
            </>
          ) : null}

          {job.quote_id ? (
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleContinueToQuote}>
              <Text style={styles.btnText}>Go to quote</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={handleContinueToQuote}>
              <Text style={styles.btnText}>Continue to quote</Text>
            </Pressable>
          )}
        </Card>
      ) : null}

      {isActive ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.section}>{terms.workCompleted}</Text>
            <TextInput
              style={[styles.textInput, styles.multi]}
              value={workCompletedNotes}
              onChangeText={setWorkCompletedNotes}
              placeholder={`${terms.workCompleted} notes`}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TextInput
              style={[styles.textInput, styles.multi]}
              value={additionalWorks}
              onChangeText={setAdditionalWorks}
              placeholder={terms.additionalWorks}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TextInput
              style={[styles.textInput, styles.multi]}
              value={additionalMaterials}
              onChangeText={setAdditionalMaterials}
              placeholder={terms.additionalMaterials}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable style={[styles.btnSecondary, busy && styles.btnDisabled]} disabled={busy} onPress={saveWorkCompletion}>
              <Text style={styles.btnSecondaryText}>Save work notes</Text>
            </Pressable>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.section}>Reschedule start</Text>
            <Pressable style={styles.input} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.inputText}>{startAt.toLocaleString('en-GB')}</Text>
            </Pressable>
            {showStartPicker ? (
              <>
                <DateTimePicker
                  value={startAt}
                  mode="datetime"
                  themeVariant="dark"
                  onChange={(_e, d) => d && setStartAt(d)}
                />
                {Platform.OS === 'ios' ? (
                  <Pressable onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.done}>Done</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            <View style={styles.switchRow}>
              <Text style={styles.label}>Add to calendar</Text>
              <Switch value={addStartToCalendar} onValueChange={setAddStartToCalendar} />
            </View>
            <Pressable style={[styles.btnSecondary, busy && styles.btnDisabled]} disabled={busy} onPress={handleRescheduleStart}>
              <Text style={styles.btnSecondaryText}>Save new start date</Text>
            </Pressable>
          </Card>
        </>
      ) : null}

      {!isLead ? (
        <>
          {!job.quote_id ? (
            <Pressable style={styles.btnSecondary} onPress={openCreateQuote}>
              <Text style={styles.btnSecondaryText}>Create quote</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btnSecondary} onPress={goToQuote}>
              <Text style={styles.btnSecondaryText}>Go to quote</Text>
            </Pressable>
          )}
        </>
      ) : null}

      {canInvoice || jobInvoice ? (
        <Pressable style={[styles.btn, jobInvoice && styles.btnDisabled]} onPress={openCreateInvoice}>
          <Text style={styles.btnText}>{jobInvoice ? `Invoiced (${jobInvoice.reference})` : 'Raise invoice'}</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.btnSecondary} onPress={async () => {
        if (!user?.id) return;
        const dup = await duplicateJob(user.id, job);
        router.push(`/job/${dup.id}`);
      }}><Text style={styles.btnSecondaryText}>Duplicate (repeat job)</Text></Pressable>

      <Text style={styles.section}>Photos</Text>
      <View style={styles.photoRow}>
        <Pressable style={styles.photoBtn} disabled={uploading} onPress={() => addPhoto('photo_before')}>
          <Text style={styles.btnSecondaryText}>+ Before</Text>
        </Pressable>
        <Pressable style={styles.photoBtn} disabled={uploading} onPress={() => addPhoto('photo_after')}>
          <Text style={styles.btnSecondaryText}>+ After</Text>
        </Pressable>
      </View>
      {uploading ? <Text style={styles.meta}>Uploading photo…</Text> : null}
      <AttachmentGallery attachments={attachments.filter((a) => a.kind === 'photo_before' || a.kind === 'photo_after')} onDelete={removeAttachment} />

      {user?.id ? (
        <VoiceNotesSection userId={user.id} customerId={job.customer_id} jobId={job.id} />
      ) : null}

      <Pressable onPress={() => router.push(`/customer/${job.customer_id}`)}><Text style={styles.link}>View client</Text></Pressable>
      <Pressable onPress={handleDelete}><Text style={styles.delete}>Delete job</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, flex: 1, fontSize: 24 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  price: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.sm },
  card: { marginTop: spacing.md, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textPrimary },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnDisabled: { opacity: 0.7 },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
  section: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  chipActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceElevated },
  chipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  input: { ...inputStyle, marginBottom: spacing.sm, justifyContent: 'center' },
  inputText: { color: colors.textPrimary, fontSize: 16 },
  textInput: { ...inputStyle, marginBottom: spacing.sm },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  done: { ...typography.caption, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing.sm },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  photoBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  link: { ...typography.body, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg, textDecorationLine: 'underline' },
  delete: { ...typography.body, color: colors.statusOverdue, textAlign: 'center', marginTop: spacing.md },
});
