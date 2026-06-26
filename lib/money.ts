import { effectiveInvoiceStatus } from '@/lib/invoices';
import { supabase } from '@/lib/supabase';
import type { CustomerSummary, MoneyStats } from '@/types/database';
import type { Invoice, Job, Payment } from '@/types/database';

export async function fetchCustomerSummary(
  userId: string,
  customerId: string,
): Promise<CustomerSummary> {
  const [paymentsRes, invoicesRes, jobsRes] = await Promise.all([
    supabase.from('payments').select('amount').eq('user_id', userId).eq('customer_id', customerId),
    supabase.from('invoices').select('*').eq('user_id', userId).eq('customer_id', customerId),
    supabase
      .from('jobs')
      .select('title, scheduled_at, status')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(1),
  ]);

  const payments = paymentsRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const lastJob = jobsRes.data?.[0] as Pick<Job, 'title' | 'scheduled_at'> | undefined;

  const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const invoiced = invoices
    .filter((i) => effectiveInvoiceStatus(i) === 'sent' || effectiveInvoiceStatus(i) === 'overdue')
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const balanceOwing = Math.max(0, invoiced - totalSpent);

  return {
    totalSpent,
    balanceOwing,
    lastJobTitle: lastJob?.title ?? null,
    lastJobDate: lastJob?.scheduled_at?.split('T')[0] ?? null,
  };
}

export async function fetchMoneyStats(userId: string): Promise<MoneyStats> {
  const [invoicesRes, paymentsRes, jobsRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId),
    supabase.from('payments').select('*').eq('user_id', userId),
    supabase.from('jobs').select('price, status').eq('user_id', userId).eq('status', 'completed'),
  ]);

  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const jobs = jobsRes.data ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstandingInvoices = invoices.filter(
    (i) => effectiveInvoiceStatus(i) === 'sent' || effectiveInvoiceStatus(i) === 'overdue',
  );
  const outstanding = outstandingInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const paidThisMonth = payments
    .filter((p) => new Date(p.paid_at) >= monthStart)
    .reduce((s, p) => s + Number(p.amount), 0);

  const paidThisYear = payments
    .filter((p) => new Date(p.paid_at) >= yearStart)
    .reduce((s, p) => s + Number(p.amount), 0);

  const completedPrices = jobs.filter((j) => j.price != null).map((j) => Number(j.price));
  const averageJobValue =
    completedPrices.length > 0
      ? completedPrices.reduce((a, b) => a + b, 0) / completedPrices.length
      : 0;

  return {
    outstanding: Math.max(0, outstanding - totalPaid > 0 ? outstanding : outstanding),
    paidThisMonth,
    paidThisYear,
    averageJobValue,
  };
}

export function formatMoney(amount: number): string {
  return `£${amount.toFixed(2)}`;
}
