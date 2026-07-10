import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { AttachmentGallery } from '@/components/AttachmentGallery';
import { Card } from '@/components/Card';
import { JobProgressBar } from '@/components/JobProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { VoiceNotesSection } from '@/components/VoiceNotesSection';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteAttachment,
  fetchAttachmentsForJob,
  uploadAttachment,
} from '@/lib/attachments';
import { fetchCustomer } from '@/lib/customers';
import { fetchInvoiceForJob } from '@/lib/invoices';
import { PIPELINE_LABELS, pipelineErrorMessage } from '@/lib/jobPipeline';
import { raiseInvoiceForJob } from '@/lib/jobWorkflow';
import { deleteJob, duplicateJob, fetchJob, formatJobDateTime } from '@/lib/jobs';
import { formatMoney } from '@/lib/money';
import { linkJobToProperty } from '@/lib/properties';
import type { Attachment, Invoice, Job } from '@/types/database';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [jobInvoice, setJobInvoice] = useState<Invoice | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    const data = await fetchJob(user.id, id);
    setJob(data);
    if (data) {
      const [customer, invoice] = await Promise.all([
        fetchCustomer(user.id, data.customer_id),
        fetchInvoiceForJob(user.id, data.id),
      ]);
      setCustomerName(customer?.name ?? '');
      setJobInvoice(invoice);
      if (customer) {
        await linkJobToProperty(user.id, data, customer);
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

  const openCreateInvoice = async () => {
    if (!user?.id || !job || !profile) return;
    if (jobInvoice) {
      router.push(`/invoice/${jobInvoice.id}`);
      return;
    }
    if (job.pipeline_status !== 'active' && job.pipeline_status !== 'quoted') {
      Alert.alert(
        'Not ready to invoice',
        job.pipeline_status === 'complete' || job.pipeline_status === 'closed'
          ? 'This job has already been invoiced or closed.'
          : 'Send and accept a quote first so the job is Active, then raise the invoice.',
      );
      return;
    }
    const customer = await fetchCustomer(user.id, job.customer_id);
    if (!customer) return;
    try {
      const invoice = await raiseInvoiceForJob(user.id, profile, customer, job, {
        customer_id: job.customer_id,
        quote_id: job.quote_id,
        reference: null,
        title: job.title,
        amount: job.price ?? 0,
        status: 'sent',
        due_at: null,
      });
      Alert.alert('Invoice raised', 'Job marked complete. Mail app opened with invoice PDF.');
      load();
      router.push(`/invoice/${invoice.id}`);
    } catch (error) {
      Alert.alert('Could not raise invoice', pipelineErrorMessage(error));
    }
  };

  if (loading || !job) {
    return <View style={styles.center}><ActivityIndicator color={colors.textPrimary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <JobProgressBar currentStatus={job.pipeline_status} />
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <StatusBadge label={PIPELINE_LABELS[job.pipeline_status]} status={job.pipeline_status} />
      </View>
      {job.reference ? <Text style={styles.meta}>{job.reference}</Text> : null}
      <Text style={styles.meta}>{formatJobDateTime(job.scheduled_at)}</Text>
      <Text style={styles.meta}>{customerName}</Text>
      {job.price != null ? <Text style={styles.price}>{formatMoney(Number(job.price))}</Text> : null}

      <Card style={styles.card}>
        {job.description ? <Text style={styles.body}>{job.description}</Text> : null}
        {job.materials ? <Text style={styles.meta}>Materials: {job.materials}</Text> : null}
        {job.notes ? <Text style={styles.meta}>Notes: {job.notes}</Text> : null}
        {job.address_line1 ? <Text style={styles.meta}>{[job.address_line1, job.city, job.postcode].filter(Boolean).join(', ')}</Text> : null}
      </Card>

      <Pressable style={styles.btnSecondary} onPress={openCreateQuote}><Text style={styles.btnSecondaryText}>Create quote</Text></Pressable>
      <Pressable style={[styles.btn, jobInvoice && styles.btnDisabled]} onPress={openCreateInvoice}>
        <Text style={styles.btnText}>{jobInvoice ? `Invoiced (${jobInvoice.reference})` : 'Raise invoice PDF & email'}</Text>
      </Pressable>
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
      <Pressable onPress={() => Alert.alert('Delete job', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          if (!user?.id) return;
          await deleteJob(user.id, job.id);
          router.back();
        }},
      ])}><Text style={styles.delete}>Delete job</Text></Pressable>
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
  card: { marginTop: spacing.md, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textPrimary },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  btnDisabled: { opacity: 0.7 },
  btnSecondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
  section: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase' },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  photoBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  link: { ...typography.body, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg, textDecorationLine: 'underline' },
  delete: { ...typography.body, color: colors.statusOverdue, textAlign: 'center', marginTop: spacing.md },
});
