import { scheduleAfterJobReminder, scheduleAfterPaidReminder, syncCustomerPaidTotal } from '@/lib/automations';
import { addJobEventToCalendar } from '@/lib/calendar';
import { generateAndEmailDocument, type DocumentDetails } from '@/lib/documents';
import { cancelJobStartReminders, scheduleJobStartReminders } from '@/lib/jobReminders';
import { createInvoice, updateInvoice } from '@/lib/invoices';
import {
  createJob,
  fetchJob,
  generateJobReference,
  syncLastAppointmentFromJob,
  updateJob,
  updateJobPipeline,
} from '@/lib/jobs';
import { createPayment } from '@/lib/payments';
import { fetchQuoteLineItems, formatQuoteLineItemLabel } from '@/lib/quoteItems';
import { updateQuote } from '@/lib/quotes';
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

export async function sendQuoteByEmail(
  userId: string,
  profile: Profile,
  client: Customer,
  quote: Quote,
): Promise<Quote> {
  const lineItems = await fetchQuoteLineItems(userId, quote.id);
  const doc = quoteDocumentDetails(
    quote,
    lineItems.map((i) => ({
      label: formatQuoteLineItemLabel(i.label, i.duration_qty, i.duration_unit),
      amount: Number(i.amount),
    })),
  );
  await generateAndEmailDocument(profile, client, doc);

  const updated = await updateQuote(userId, quote.id, {
    status: 'sent',
    sent_at: quote.sent_at ?? new Date().toISOString(),
  });

  if (quote.job_id) {
    await updateJobPipeline(userId, quote.job_id, 'quoted');
  }

  return updated;
}

export type AcceptQuoteOptions = {
  startAt: string;
  addToCalendar?: boolean;
  customer: Customer;
};

async function advanceJobToActive(userId: string, jobId: string, pipelineStatus: Job['pipeline_status']): Promise<void> {
  if (pipelineStatus === 'lead') {
    await updateJobPipeline(userId, jobId, 'quoted');
    await updateJobPipeline(userId, jobId, 'active');
  } else if (pipelineStatus === 'quoted') {
    await updateJobPipeline(userId, jobId, 'active');
  }
}

export async function acceptQuoteAndActivateJob(
  userId: string,
  quote: Quote,
  options: AcceptQuoteOptions,
): Promise<Job> {
  const { startAt, addToCalendar, customer } = options;
  await updateQuote(userId, quote.id, { status: 'accepted' });

  const jobFields = {
    status: 'upcoming' as const,
    price: quote.amount,
    start_at: startAt,
    scheduled_at: startAt,
  };

  let job: Job;
  if (quote.job_id) {
    const existing = await fetchJob(userId, quote.job_id);
    if (!existing) throw new Error('Job not found');
    await advanceJobToActive(userId, quote.job_id, existing.pipeline_status);
    job = await updateJob(userId, quote.job_id, jobFields);
  } else {
    job = await createJob(userId, {
      customer_id: quote.customer_id,
      reference: generateJobReference(),
      title: quote.title,
      description: quote.description,
      scheduled_at: startAt,
      duration_minutes: null,
      address_line1: customer.address_line1,
      city: customer.city,
      postcode: customer.postcode,
      status: 'upcoming',
      pipeline_status: 'active',
      price: quote.amount,
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
      quote_id: quote.id,
      property_id: null,
    });
    await updateQuote(userId, quote.id, { job_id: job.id });
  }

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
  if (currentJob.pipeline_status === 'quoted') {
    currentJob = await updateJobPipeline(userId, job.id, 'active');
  }

  const draft: DocumentDetails = {
    type: 'Invoice',
    reference: invoicePayload.reference ?? generateInvoiceReference(),
    title: invoicePayload.title,
    date: formatDocDate(new Date().toISOString()),
    lineItems: [{ label: invoicePayload.title, amount: Number(invoicePayload.amount) }],
    subtotal: Number(invoicePayload.amount),
    total: Number(invoicePayload.amount),
  };

  await generateAndEmailDocument(profile, client, draft);

  const invoice = await createInvoice(userId, {
    ...invoicePayload,
    job_id: currentJob.id,
    status: invoicePayload.status ?? 'sent',
  });

  const updatedJob = await updateJob(userId, currentJob.id, { status: 'in_progress' });
  await updateJobPipeline(userId, currentJob.id, 'invoiced');
  await syncLastAppointmentFromJob(userId, job.customer_id, updatedJob);
  await scheduleAfterJobReminder(userId, job.customer_id, updatedJob.scheduled_at);

  return invoice;
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
  await generateAndEmailDocument(profile, client, doc);

  if (invoice.job_id) {
    const job = await fetchJob(userId, invoice.job_id);
    return job;
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
