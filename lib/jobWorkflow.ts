import { scheduleAfterJobReminder, scheduleAfterPaidReminder, syncCustomerPaidTotal } from '@/lib/automations';
import { generateAndEmailDocument, type DocumentDetails } from '@/lib/documents';
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
import { fetchQuoteLineItems } from '@/lib/quoteItems';
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

/** Send quote PDF via mail, mark quote sent, move linked job to Quoted. */
export async function sendQuoteByEmail(
  userId: string,
  profile: Profile,
  client: Customer,
  quote: Quote,
): Promise<Quote> {
  const lineItems = await fetchQuoteLineItems(userId, quote.id);
  const doc = quoteDocumentDetails(quote, lineItems.map((i) => ({ label: i.label, amount: Number(i.amount) })));
  await generateAndEmailDocument(profile, client, doc);

  const updated = await updateQuote(userId, quote.id, { status: 'sent' });

  if (quote.job_id) {
    await updateJobPipeline(userId, quote.job_id, 'quoted');
  }

  return updated;
}

/** Accept quote: activate job (or create one) and set pipeline Active. */
export async function acceptQuoteAndActivateJob(
  userId: string,
  quote: Quote,
  customer: Customer,
): Promise<Job> {
  await updateQuote(userId, quote.id, { status: 'accepted' });

  if (quote.job_id) {
    const existing = await fetchJob(userId, quote.job_id);
    if (existing?.pipeline_status === 'lead') {
      await updateJobPipeline(userId, quote.job_id, 'quoted');
    }
    const job = await updateJob(userId, quote.job_id, {
      status: 'upcoming',
      pipeline_status: 'active',
      price: quote.amount,
    });
    return job;
  }

  const job = await createJob(userId, {
    customer_id: quote.customer_id,
    reference: generateJobReference(),
    title: quote.title,
    description: quote.description,
    scheduled_at: new Date().toISOString(),
    duration_minutes: null,
    address_line1: customer.address_line1,
    city: customer.city,
    postcode: customer.postcode,
    status: 'upcoming',
    pipeline_status: 'active',
    price: quote.amount,
    materials: null,
    notes: null,
    quote_id: quote.id,
    property_id: null,
  });
  await updateQuote(userId, quote.id, { job_id: job.id });
  return job;
}

/** Raise invoice: email PDF, create invoice row, mark job Complete. */
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

  const updatedJob = await updateJob(userId, currentJob.id, {
    status: 'completed',
    pipeline_status: 'complete',
  });
  await syncLastAppointmentFromJob(userId, job.customer_id, updatedJob);
  await scheduleAfterJobReminder(userId, job.customer_id, updatedJob.scheduled_at);

  return invoice;
}

/** Log payment, email receipt, mark invoice paid (DB trigger closes job). */
export async function logPaymentWithReceipt(
  userId: string,
  profile: Profile,
  client: Customer,
  invoice: Invoice,
  amount: number,
): Promise<void> {
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
}
