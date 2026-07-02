import { generateInvoiceReference } from '@/lib/references';
import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceInsert, InvoiceStatus, InvoiceUpdate } from '@/types/database';

export { generateInvoiceReference as generateReference, generateReference as generateReferenceWithPrefix } from '@/lib/references';

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoicesForCustomer(userId: string, customerId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoice(userId: string, invoiceId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchInvoiceForJob(userId: string, jobId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchInvoiceForQuote(userId: string, quoteId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('quote_id', quoteId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchInvoicedQuoteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('quote_id')
    .eq('user_id', userId)
    .not('quote_id', 'is', null);

  if (error) throw error;
  return (data ?? []).map((row) => row.quote_id as string);
}

export async function assertInvoiceAllowed(
  userId: string,
  payload: Pick<InvoiceInsert, 'job_id' | 'quote_id'>,
): Promise<void> {
  if (payload.quote_id) {
    const existing = await fetchInvoiceForQuote(userId, payload.quote_id);
    if (existing) throw new Error('This quote has already been invoiced.');
  }
  if (payload.job_id) {
    const existing = await fetchInvoiceForJob(userId, payload.job_id);
    if (existing) throw new Error('This job has already been invoiced.');
  }
}

export async function createInvoice(userId: string, payload: InvoiceInsert): Promise<Invoice> {
  await assertInvoiceAllowed(userId, payload);

  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      if (payload.quote_id) throw new Error('This quote has already been invoiced.');
      if (payload.job_id) throw new Error('This job has already been invoiced.');
    }
    throw error;
  }
  return data;
}

export async function updateInvoice(
  userId: string,
  invoiceId: string,
  payload: InvoiceUpdate,
): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', invoiceId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvoice(userId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('user_id', userId).eq('id', invoiceId);
  if (error) throw error;
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
  if (!invoice.due_at) return false;
  const due = new Date(invoice.due_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function effectiveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (isInvoiceOverdue(invoice) && invoice.status !== 'paid') return 'overdue';
  return invoice.status;
}

export async function duplicateInvoice(userId: string, invoice: Invoice): Promise<Invoice> {
  return createInvoice(userId, {
    customer_id: invoice.customer_id,
    job_id: null,
    quote_id: null,
    reference: generateInvoiceReference(),
    title: invoice.title,
    amount: invoice.amount,
    status: 'draft',
    due_at: invoice.due_at,
  });
}
