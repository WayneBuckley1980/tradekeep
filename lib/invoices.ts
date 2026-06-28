import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceInsert, InvoiceStatus, InvoiceUpdate } from '@/types/database';

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

export async function createInvoice(userId: string, payload: InvoiceInsert): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
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

export function generateReference(prefix: string): string {
  const n = Date.now().toString(36).toUpperCase();
  return `${prefix}-${n.slice(-6)}`;
}

export async function duplicateInvoice(userId: string, invoice: Invoice): Promise<Invoice> {
  return createInvoice(userId, {
    customer_id: invoice.customer_id,
    job_id: invoice.job_id,
    quote_id: invoice.quote_id,
    reference: generateReference('INV'),
    title: invoice.title,
    amount: invoice.amount,
    status: 'draft',
    due_at: invoice.due_at,
  });
}
