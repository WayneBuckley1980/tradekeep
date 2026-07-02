import { fetchCustomer, updateCustomer } from '@/lib/customers';
import { assertInvoiceAllowed, createInvoice, fetchInvoiceForJob, generateReference } from '@/lib/invoices';
import { fetchPaymentsForCustomer } from '@/lib/payments';
import { computeFollowUpDate } from '@/lib/reminders';
import { addDays, formatDateOnly, parseDateOnly } from '@/lib/dates';
import type { Invoice, Job } from '@/types/database';

export async function createInvoiceFromJob(userId: string, job: Job, quoteId?: string | null): Promise<Invoice> {
  const existing = await fetchInvoiceForJob(userId, job.id);
  if (existing) throw new Error('This job has already been invoiced.');

  const resolvedQuoteId = quoteId ?? job.quote_id;
  await assertInvoiceAllowed(userId, { job_id: job.id, quote_id: resolvedQuoteId });

  return createInvoice(userId, {
    customer_id: job.customer_id,
    job_id: job.id,
    quote_id: quoteId ?? job.quote_id,
    reference: generateReference(),
    title: job.title,
    amount: job.price ?? 0,
    status: 'sent',
    due_at: null,
  });
}

export async function syncCustomerPaidTotal(userId: string, customerId: string): Promise<void> {
  const payments = await fetchPaymentsForCustomer(userId, customerId);
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  await updateCustomer(userId, customerId, { amount_paid: total });
}

export async function scheduleAfterJobReminder(userId: string, customerId: string, jobDate: string): Promise<void> {
  const customer = await fetchCustomer(userId, customerId);
  if (!customer || customer.reminder_type !== 'after_job') return;

  const base = parseDateOnly(jobDate.split('T')[0]);
  const followUp = base ? formatDateOnly(addDays(base, 7)) : jobDate.split('T')[0];
  await updateCustomer(userId, customerId, { follow_up_at: followUp });
}

export async function scheduleAfterPaidReminder(userId: string, customerId: string): Promise<void> {
  const customer = await fetchCustomer(userId, customerId);
  if (!customer || customer.reminder_type !== 'after_paid') return;

  const followUp = computeFollowUpDate('next_week');
  if (followUp) {
    await updateCustomer(userId, customerId, { follow_up_at: followUp });
  }
}
