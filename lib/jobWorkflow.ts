import { scheduleAfterJobReminder, scheduleAfterPaidReminder, syncCustomerPaidTotal } from '@/lib/automations';
import { addJobEventToCalendar } from '@/lib/calendar';
import { DocumentEmailCancelledError, generateAndEmailDocument, type DocumentDetails } from '@/lib/documents';
import { cancelJobStartReminders, scheduleJobStartReminders } from '@/lib/jobReminders';
import { createInvoice, fetchInvoiceForJob, updateInvoice } from '@/lib/invoices';
import {
  advanceJobPipelineTo,
  createJob,
  fetchJob,
  fetchJobForQuote,
  generateJobReference,
  syncLastAppointmentFromJob,
  updateJob,
} from '@/lib/jobs';
import { pipelineStatusIndex } from '@/lib/jobPipeline';
import { createPayment } from '@/lib/payments';
import { fetchQuoteLineItems, formatQuoteLineItemLabel } from '@/lib/quoteItems';
import { fetchQuote, updateQuote } from '@/lib/quotes';
import { generateInvoiceReference } from '@/lib/references';
import type { Customer, Invoice, Job, Profile, Quote } from '@/types/database';

function formatDocDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB');
}

function quoteDocumentDetails(quote: Quote, lineItems: { label: string; amount: number }[]): DocumentDetails {
  const items =
    lineItems.length > 0
      ? lineItems
      : [{ label: quote.title, amount: Number(quote.amount) }];
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  return {
    type: 'Quote',
    reference: quote.reference ?? quote.id.slice(0, 8),
    title: quote.title,
    date: formatDocDate(quote.created_at),
    lineItems: items,
    subtotal,
    total: Number(quote.amount) || subtotal,
    notes: quote.description,
  };
}

function invoiceDocumentDetails(invoice: Invoice): DocumentDetails {
  return {
    type: 'Invoice',
    reference: invoice.reference ?? invoice.id.slice(0, 8),
    title: invoice.title,
    date: formatDocDate(invoice.created_at),
    lineItems: [{ label: invoice.title, amount: Number(invoice.amount) }],
    subtotal: Number(invoice.amount),
    total: Number(invoice.amount),
  };
}

function receiptDocumentDetails(invoice: Invoice, amount: number): DocumentDetails {
  return {
    type: 'Receipt',
    reference: `RCP-${invoice.reference ?? invoice.id.slice(0, 8)}`,
    title: `Payment for ${invoice.title}`,
    date: formatDocDate(new Date().toISOString()),
    lineItems: [{ label: invoice.title, amount }],
    subtotal: amount,
    total: amount,
  };
}

export async function syncJobPipelineAfterQuoteLinked(userId: string, jobId: string): Promise<Job | null> {
  const job = await fetchJob(userId, jobId);
  if (!job) return null;
  if (pipelineStatusIndex(job.pipeline_status) >= pipelineStatusIndex('quoted')) return job;
  return advanceJobPipelineTo(userId, jobId, job.pipeline_status, 'quoted');
}

export async function sendQuoteByEmail(
  userId: string,
  profile: Profile,
  client: Customer,
  quote: Quote,
): Promise<{ quote: Quote; emailed: boolean }> {
  const lineItems = await fetchQuoteLineItems(userId, quote.id);
  const doc = quoteDocumentDetails(
    quote,
    lineItems.map((i) => ({
      label: formatQuoteLineItemLabel(i.label, i.duration_qty, i.duration_unit),
      amount: Number(i.amount),
    })),
  );
  const { emailed } = await generateAndEmailDocument(profile, client, doc, { emailOptional: true });

  const updated = await updateQuote(userId, quote.id, {
    status: 'sent',
    sent_at: quote.sent_at ?? new Date().toISOString(),
  });

  if (quote.job_id) {
    await syncJobPipelineAfterQuoteLinked(userId, quote.job_id);
  }

  return { quote: updated, emailed };
}

export type AcceptQuoteOptions = {
  startAt: string;
  addToCalendar?: boolean;
  customer: Customer;
};

export async function acceptQuoteAndActivateJob(
  userId: string,
  quote: Quote,
  options: AcceptQuoteOptions,
): Promise<Job> {
  const { startAt, addToCalendar, customer } = options;

  const freshQuote = await fetchQuote(userId, quote.id);
  if (!freshQuote) throw new Error('Quote not found');

  if (freshQuote.status === 'accepted') {
    if (freshQuote.job_id) {
      const linked = await fetchJob(userId, freshQuote.job_id);
      if (linked) return linked;
    }
    const orphan = await fetchJobForQuote(userId, freshQuote.id);
    if (orphan) {
      await updateQuote(userId, freshQuote.id, { job_id: orphan.id });
      return orphan;
    }
    throw new Error('This quote is already accepted but the job link is missing.');
  }

  const jobFields = {
    status: 'upcoming' as const,
    price: freshQuote.amount,
    start_at: startAt,
    scheduled_at: startAt,
  };

  let job: Job;

  if (freshQuote.job_id) {
    const existing = await fetchJob(userId, freshQuote.job_id);
    if (!existing) throw new Error('Job not found');

    if (pipelineStatusIndex(existing.pipeline_status) > pipelineStatusIndex('active')) {
      throw new Error('This job has already been invoiced or completed.');
    }

    job = await advanceJobPipelineTo(
      userId,
      freshQuote.job_id,
      existing.pipeline_status,
      'active',
      jobFields,
    );
  } else {
    const existingForQuote = await fetchJobForQuote(userId, freshQuote.id);
    if (existingForQuote) {
      job = await advanceJobPipelineTo(
        userId,
        existingForQuote.id,
        existingForQuote.pipeline_status,
        'active',
        jobFields,
      );
    } else {
      job = await createJob(userId, {
        customer_id: freshQuote.customer_id,
        reference: generateJobReference(),
        title: freshQuote.title,
        description: freshQuote.description,
        scheduled_at: startAt,
        duration_minutes: null,
        address_line1: customer.address_line1,
        city: customer.city,
        postcode: customer.postcode,
        status: 'upcoming',
        pipeline_status: 'active',
        price: freshQuote.amount,
        materials: null,
        notes: null,
        visit_required: null,
        visit_at: null,
        start_at: startAt,
        work_completed_notes: null,
        additional_works: null,
        additional_materials: null,
        deleted_at: null,
        job_notification_ids: null,
        quote_id: freshQuote.id,
        property_id: null,
      });
    }
  }

  await updateQuote(userId, freshQuote.id, {
    status: 'accepted',
    job_id: job.id,
  });

  if (addToCalendar) {
    try {
      await addJobEventToCalendar({
        title: job.title,
        startDate: new Date(startAt),
        location: [customer.address_line1, customer.city].filter(Boolean).join(', '),
        notes: 'TradeKeepCRM job start',
      });
    } catch (error) {
      console.error('Failed to add job to calendar', error);
    }
  }

  try {
    await cancelJobStartReminders(job.job_notification_ids);
    const job_notification_ids = await scheduleJobStartReminders(job.id, job.title, startAt);
    job = await updateJob(userId, job.id, { job_notification_ids });
  } catch (error) {
    console.error('Failed to schedule job start reminders', error);
  }

  return job;
}

export async function raiseInvoiceForJob(
  userId: string,
  profile: Profile,
  client: Customer,
  job: Job,
  invoicePayload: Omit<Parameters<typeof createInvoice>[1], 'job_id'>,
): Promise<Invoice> {
  let currentJob = job;
  if (pipelineStatusIndex(currentJob.pipeline_status) < pipelineStatusIndex('active')) {
    currentJob = await advanceJobPipelineTo(userId, job.id, currentJob.pipeline_status, 'active');
  }

  const invoice = await createInvoice(userId, {
    ...invoicePayload,
    job_id: currentJob.id,
    status: invoicePayload.status ?? 'sent',
  });

  currentJob = await updateJob(userId, currentJob.id, { status: 'in_progress' });
  currentJob = await advanceJobPipelineTo(userId, currentJob.id, currentJob.pipeline_status, 'invoiced');

  const draft: DocumentDetails = {
    type: 'Invoice',
    reference: invoice.reference ?? invoicePayload.reference ?? generateInvoiceReference(),
    title: invoice.title,
    date: formatDocDate(invoice.created_at),
    lineItems: [{ label: invoice.title, amount: Number(invoice.amount) }],
    subtotal: Number(invoice.amount),
    total: Number(invoice.amount),
  };

  try {
    await generateAndEmailDocument(profile, client, draft, { emailOptional: true });
  } catch (error) {
    if (error instanceof DocumentEmailCancelledError) {
      // Invoice is already saved and job is invoiced.
      return invoice;
    }
    console.error('Invoice email failed after invoice was saved', error);
  }

  await syncLastAppointmentFromJob(userId, job.customer_id, currentJob);
  await scheduleAfterJobReminder(userId, job.customer_id, currentJob.scheduled_at);

  return invoice;
}

/** Move job to Invoiced when an invoice is saved (e.g. from client screen). */
export async function syncJobPipelineAfterInvoiceCreated(userId: string, invoice: Invoice): Promise<Job | null> {
  if (!invoice.job_id) return null;
  const job = await fetchJob(userId, invoice.job_id);
  if (!job) return null;
  if (pipelineStatusIndex(job.pipeline_status) >= pipelineStatusIndex('invoiced')) return job;

  await updateJob(userId, job.id, { status: 'in_progress' });
  return advanceJobPipelineTo(userId, job.id, job.pipeline_status, 'invoiced');
}

/** Advance job to Complete after invoice is paid (DB trigger only fires when already Invoiced). */
export async function completeJobAfterPayment(userId: string, invoice: Invoice): Promise<Job | null> {
  if (!invoice.job_id) return null;
  let job = await fetchJob(userId, invoice.job_id);
  if (!job) return null;
  if (job.pipeline_status === 'complete' || job.pipeline_status === 'closed') return job;

  if (pipelineStatusIndex(job.pipeline_status) < pipelineStatusIndex('invoiced')) {
    job = await syncJobPipelineAfterInvoiceCreated(userId, invoice);
    if (!job) return null;
  }

  if (job.pipeline_status === 'invoiced') {
    return advanceJobPipelineTo(userId, job.id, 'invoiced', 'complete', { status: 'completed' });
  }

  return job;
}

/** Fix jobs stuck at Active when invoice/payment already exist. */
export async function reconcileJobPipelineFromInvoices(userId: string, job: Job): Promise<Job> {
  if (job.pipeline_status === 'complete' || job.pipeline_status === 'closed') return job;

  const invoice = await fetchInvoiceForJob(userId, job.id);
  if (!invoice || invoice.status === 'cancelled') {
    if (job.pipeline_status === 'invoiced') {
      return updateJob(userId, job.id, { pipeline_status: 'active', status: 'upcoming' });
    }
    return job;
  }

  if (invoice.status === 'paid') {
    const completed = await completeJobAfterPayment(userId, invoice);
    return completed ?? job;
  }

  if (pipelineStatusIndex(job.pipeline_status) < pipelineStatusIndex('invoiced')) {
    const synced = await syncJobPipelineAfterInvoiceCreated(userId, invoice);
    return synced ?? job;
  }

  return job;
}

/** Align job pipeline with linked quote status. */
export async function reconcileJobPipelineFromQuotes(
  userId: string,
  job: Job,
  quotes: Quote[],
): Promise<Job> {
  if (job.pipeline_status === 'complete' || job.pipeline_status === 'closed') return job;

  const quote =
    (job.quote_id ? quotes.find((q) => q.id === job.quote_id) : null) ??
    quotes.find((q) => q.job_id === job.id && q.status !== 'rejected' && q.status !== 'expired');

  if (!quote) return job;

  if (quote.status === 'accepted' && pipelineStatusIndex(job.pipeline_status) < pipelineStatusIndex('active')) {
    return advanceJobPipelineTo(userId, job.id, job.pipeline_status, 'active', {
      price: quote.amount,
    });
  }

  if (
    (quote.status === 'sent' || quote.status === 'draft' || quote.status === 'accepted') &&
    pipelineStatusIndex(job.pipeline_status) < pipelineStatusIndex('quoted')
  ) {
    return advanceJobPipelineTo(userId, job.id, job.pipeline_status, 'quoted');
  }

  return job;
}

export async function reconcileJobPipeline(userId: string, job: Job, quotes: Quote[]): Promise<Job> {
  let current = await reconcileJobPipelineFromQuotes(userId, job, quotes);
  current = await reconcileJobPipelineFromInvoices(userId, current);
  return current;
}

export async function downgradeJobWhenInvoiceRemoved(userId: string, jobId: string): Promise<void> {
  const job = await fetchJob(userId, jobId);
  if (!job || job.pipeline_status !== 'invoiced') return;
  const invoice = await fetchInvoiceForJob(userId, jobId);
  if (invoice) return;
  await updateJob(userId, jobId, { pipeline_status: 'active', status: 'upcoming' });
}

export async function logPaymentWithReceipt(
  userId: string,
  profile: Profile,
  client: Customer,
  invoice: Invoice,
  amount: number,
): Promise<Job | null> {
  await createPayment(userId, {
    customer_id: invoice.customer_id,
    invoice_id: invoice.id,
    job_id: invoice.job_id,
    amount,
    paid_at: new Date().toISOString(),
    method: 'bank',
    notes: null,
  });

  await updateInvoice(userId, invoice.id, { status: 'paid' });
  await syncCustomerPaidTotal(userId, invoice.customer_id);
  await scheduleAfterPaidReminder(userId, invoice.customer_id);

  const doc = receiptDocumentDetails(invoice, amount);
  try {
    await generateAndEmailDocument(profile, client, doc, { emailOptional: true });
  } catch (error) {
    if (error instanceof DocumentEmailCancelledError) {
      // Payment is recorded; receipt email was optional.
    } else {
      console.error('Receipt email failed after payment was recorded', error);
    }
  }

  if (invoice.job_id) {
    const paidInvoice = { ...invoice, status: 'paid' as const };
    return completeJobAfterPayment(userId, paidInvoice);
  }
  return null;
}

export async function saveVisitPlan(
  userId: string,
  job: Job,
  visitRequired: boolean,
  visitAt: string | null,
  addToCalendar?: boolean,
  customer?: Customer,
): Promise<Job> {
  const updated = await updateJob(userId, job.id, {
    visit_required: visitRequired,
    visit_at: visitRequired ? visitAt : null,
    scheduled_at: visitRequired && visitAt ? visitAt : job.scheduled_at,
  });

  if (visitRequired && visitAt && addToCalendar && customer) {
    await addJobEventToCalendar({
      title: `Site visit: ${job.title}`,
      startDate: new Date(visitAt),
      location: [customer.address_line1, customer.city].filter(Boolean).join(', '),
      notes: 'TradeKeepCRM client visit',
    });
  }

  return updated;
}

export async function rescheduleJobStart(
  userId: string,
  job: Job,
  startAt: string,
  addToCalendar?: boolean,
  customer?: Customer,
): Promise<Job> {
  await cancelJobStartReminders(job.job_notification_ids);
  const job_notification_ids = await scheduleJobStartReminders(job.id, job.title, startAt);

  const updated = await updateJob(userId, job.id, {
    start_at: startAt,
    scheduled_at: startAt,
    job_notification_ids,
  });

  if (addToCalendar && customer) {
    await addJobEventToCalendar({
      title: job.title,
      startDate: new Date(startAt),
      location: [customer.address_line1, customer.city].filter(Boolean).join(', '),
      notes: 'TradeKeepCRM job start',
    });
  }

  return updated;
}
