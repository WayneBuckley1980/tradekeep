import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import type { Attachment, AttachmentKind } from '@/types/database';

const BUCKET = 'attachments';

export async function fetchAttachmentsForJob(userId: string, jobId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchAttachmentsForCustomer(userId: string, customerId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function uploadAttachment(
  userId: string,
  params: {
    uri: string;
    kind: AttachmentKind;
    customerId?: string;
    jobId?: string;
    quoteId?: string;
    invoiceId?: string;
    fileName?: string;
    caption?: string;
  },
): Promise<Attachment> {
  const ext = params.fileName?.split('.').pop() ?? 'jpg';
  const id = Crypto.randomUUID();
  const storagePath = `${userId}/${params.jobId ?? 'general'}/${id}.${ext}`;

  const response = await fetch(params.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      user_id: userId,
      customer_id: params.customerId ?? null,
      job_id: params.jobId ?? null,
      quote_id: params.quoteId ?? null,
      invoice_id: params.invoiceId ?? null,
      kind: params.kind,
      storage_path: storagePath,
      file_name: params.fileName ?? null,
      caption: params.caption ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteAttachment(userId: string, attachment: Attachment): Promise<void> {
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('user_id', userId)
    .eq('id', attachment.id);
  if (error) throw error;
}
