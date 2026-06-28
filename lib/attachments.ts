import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';
import type { Attachment, AttachmentKind } from '@/types/database';

const BUCKET = 'attachments';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function contentTypeForFileName(fileName?: string): string {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? 'jpg';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

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
  const fileName = params.fileName ?? 'file.bin';
  const ext = fileName.split('.').pop() ?? 'bin';
  const id = Crypto.randomUUID();
  const folder = params.jobId ?? params.customerId ?? 'general';
  const storagePath = `${userId}/${folder}/${id}.${ext}`;
  const contentType = contentTypeForFileName(fileName);

  const body = await readUriAsArrayBuffer(params.uri);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
    contentType,
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
      file_name: fileName,
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

export async function getAttachmentUrls(attachments: Attachment[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  await Promise.all(
    attachments.map(async (attachment) => {
      const url = await getAttachmentUrl(attachment.storage_path);
      if (url) urls.set(attachment.id, url);
    }),
  );
  return urls;
}

export function isImageAttachment(kind: AttachmentKind): boolean {
  return kind === 'photo_before' || kind === 'photo_after' || kind === 'document_photo';
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  return kind.replace(/_/g, ' ');
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
