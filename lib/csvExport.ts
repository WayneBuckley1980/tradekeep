import { fetchCustomers } from '@/lib/customers';
import { fetchInvoices } from '@/lib/invoices';
import { fetchJobs } from '@/lib/jobs';
import { fetchLeads, leadStatusLabel } from '@/lib/leads';
import { fetchQuotes } from '@/lib/quotes';
import { supabase } from '@/lib/supabase';
import type { Customer, Invoice, Job, Lead, Quote, QuoteLineItem } from '@/types/database';

const UTF8_BOM = '\uFEFF';

export type CsvExportSummary = {
  clients: number;
  leads: number;
  jobs: number;
  quotes: number;
  quoteLines: number;
  invoices: number;
  totalRows: number;
};

export type CsvExportResult = {
  filename: string;
  content: string;
  rowCount: number;
};

type CsvCell = string | number | boolean | null | undefined;

type RecordType = 'Client' | 'Lead' | 'Job' | 'Quote' | 'Quote Line' | 'Invoice';

type ExportRow = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  recordType: RecordType;
  reference: string;
  titleDescription: string;
  date: string;
  sortDate: string;
  amount: string;
  status: string;
  notes: string;
};

const RECORD_TYPE_ORDER: Record<RecordType, number> = {
  Client: 0,
  Lead: 1,
  Job: 2,
  Quote: 3,
  'Quote Line': 4,
  Invoice: 5,
};

const CSV_HEADERS = [
  'Client Name',
  'Client Phone',
  'Client Email',
  'Record Type',
  'Reference',
  'Title/Description',
  'Date',
  'Amount (GBP)',
  'Status',
  'Notes',
];

export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(escapeCsvField).join(','), ...rows.map((row) => row.map(escapeCsvField).join(','))];
  return UTF8_BOM + lines.join('\r\n');
}

export function formatCsvDate(value: string | null | undefined): string {
  if (!value) return '';
  const datePart = value.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB');
}

export function formatCsvDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatCsvDate(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCsvMoney(amount: number | null | undefined): string {
  if (amount == null) return '';
  return amount.toFixed(2);
}

function joinTitleDescription(title: string, description: string | null | undefined): string {
  const parts = [title, description?.trim()].filter(Boolean);
  return parts.join(' — ');
}

function clientStatus(customer: Customer): string {
  if (customer.archived_at) return 'Archived';
  if (customer.is_favourite) return 'Favourite';
  return 'Active';
}

function clientColumns(customer: Customer): Pick<ExportRow, 'clientName' | 'clientPhone' | 'clientEmail'> {
  return {
    clientName: customer.name,
    clientPhone: customer.phone ?? '',
    clientEmail: customer.email ?? '',
  };
}

async function fetchAllQuoteLineItems(userId: string): Promise<QuoteLineItem[]> {
  const { data, error } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('user_id', userId)
    .order('quote_id')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

function sortExportRows(rows: ExportRow[]): ExportRow[] {
  return [...rows].sort((a, b) => {
    const nameCompare = a.clientName.localeCompare(b.clientName, 'en-GB', { sensitivity: 'base' });
    if (nameCompare !== 0) return nameCompare;

    const typeCompare = RECORD_TYPE_ORDER[a.recordType] - RECORD_TYPE_ORDER[b.recordType];
    if (typeCompare !== 0) return typeCompare;

    return a.sortDate.localeCompare(b.sortDate);
  });
}

function exportRowToCsv(row: ExportRow): CsvCell[] {
  return [
    row.clientName,
    row.clientPhone,
    row.clientEmail,
    row.recordType,
    row.reference,
    row.titleDescription,
    row.date,
    row.amount,
    row.status,
    row.notes,
  ];
}

function buildClientRow(customer: Customer): ExportRow {
  const sortDate = customer.last_contacted_at ?? customer.created_at;
  const titleParts = [customer.next_action?.trim(), customer.follow_up_at ? `Follow-up ${formatCsvDate(customer.follow_up_at)}` : '']
    .filter(Boolean)
    .join('; ');

  return {
    ...clientColumns(customer),
    recordType: 'Client',
    reference: '',
    titleDescription: titleParts || 'Client record',
    date: formatCsvDateTime(sortDate),
    sortDate,
    amount: formatCsvMoney(customer.amount_paid),
    status: clientStatus(customer),
    notes: customer.notes ?? '',
  };
}

function buildLeadRow(customer: Customer, lead: Lead): ExportRow {
  return {
    ...clientColumns(customer),
    recordType: 'Lead',
    reference: '',
    titleDescription: lead.requested_service ?? lead.name,
    date: formatCsvDateTime(lead.created_at),
    sortDate: lead.created_at,
    amount: '',
    status: leadStatusLabel(lead.status),
    notes: lead.notes ?? '',
  };
}

function buildJobRow(customer: Customer, job: Job): ExportRow {
  return {
    ...clientColumns(customer),
    recordType: 'Job',
    reference: job.reference ?? '',
    titleDescription: joinTitleDescription(job.title, job.description),
    date: formatCsvDateTime(job.scheduled_at),
    sortDate: job.scheduled_at,
    amount: formatCsvMoney(job.price),
    status: job.status,
    notes: [job.materials, job.notes].filter(Boolean).join('; '),
  };
}

function buildQuoteRow(customer: Customer, quote: Quote): ExportRow {
  const validUntil = quote.valid_until ? `Valid until ${formatCsvDate(quote.valid_until)}` : '';
  return {
    ...clientColumns(customer),
    recordType: 'Quote',
    reference: quote.reference ?? '',
    titleDescription: joinTitleDescription(quote.title, quote.description),
    date: formatCsvDateTime(quote.created_at),
    sortDate: quote.created_at,
    amount: formatCsvMoney(Number(quote.amount)),
    status: quote.status,
    notes: validUntil,
  };
}

function buildQuoteLineRow(customer: Customer, quote: Quote, item: QuoteLineItem): ExportRow {
  return {
    ...clientColumns(customer),
    recordType: 'Quote Line',
    reference: quote.reference ?? '',
    titleDescription: item.label,
    date: formatCsvDateTime(quote.created_at),
    sortDate: quote.created_at,
    amount: formatCsvMoney(Number(item.amount)),
    status: quote.status,
    notes: '',
  };
}

function buildInvoiceRow(customer: Customer, invoice: Invoice): ExportRow {
  return {
    ...clientColumns(customer),
    recordType: 'Invoice',
    reference: invoice.reference ?? '',
    titleDescription: invoice.title,
    date: formatCsvDate(invoice.due_at ?? invoice.created_at),
    sortDate: invoice.due_at ?? invoice.created_at,
    amount: formatCsvMoney(Number(invoice.amount)),
    status: invoice.status,
    notes: invoice.due_at ? `Due ${formatCsvDate(invoice.due_at)}` : '',
  };
}

export async function fetchCsvExportSummary(userId: string): Promise<CsvExportSummary> {
  const [customers, leads, jobs, quotes, invoices, lineItems] = await Promise.all([
    fetchCustomers(userId, true),
    fetchLeads(userId),
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchInvoices(userId),
    fetchAllQuoteLineItems(userId),
  ]);

  const convertedLeads = leads.filter((lead) => lead.converted_customer_id);
  const totalRows =
    customers.length + convertedLeads.length + jobs.length + quotes.length + lineItems.length + invoices.length;

  return {
    clients: customers.length,
    leads: convertedLeads.length,
    jobs: jobs.length,
    quotes: quotes.length,
    quoteLines: lineItems.length,
    invoices: invoices.length,
    totalRows,
  };
}

export async function buildUnifiedCsvExport(userId: string): Promise<CsvExportResult> {
  const exportedAt = new Date().toISOString().slice(0, 10);
  const [customers, leads, jobs, quotes, invoices, lineItems] = await Promise.all([
    fetchCustomers(userId, true),
    fetchLeads(userId),
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchInvoices(userId),
    fetchAllQuoteLineItems(userId),
  ]);

  const leadsByCustomer = new Map<string, Lead>();
  for (const lead of leads) {
    if (lead.converted_customer_id) {
      leadsByCustomer.set(lead.converted_customer_id, lead);
    }
  }

  const jobsByCustomer = new Map<string, Job[]>();
  for (const job of jobs) {
    const list = jobsByCustomer.get(job.customer_id) ?? [];
    list.push(job);
    jobsByCustomer.set(job.customer_id, list);
  }

  const quotesByCustomer = new Map<string, Quote[]>();
  for (const quote of quotes) {
    const list = quotesByCustomer.get(quote.customer_id) ?? [];
    list.push(quote);
    quotesByCustomer.set(quote.customer_id, list);
  }

  const lineItemsByQuote = new Map<string, QuoteLineItem[]>();
  for (const item of lineItems) {
    const list = lineItemsByQuote.get(item.quote_id) ?? [];
    list.push(item);
    lineItemsByQuote.set(item.quote_id, list);
  }

  const invoicesByCustomer = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    const list = invoicesByCustomer.get(invoice.customer_id) ?? [];
    list.push(invoice);
    invoicesByCustomer.set(invoice.customer_id, list);
  }

  const rows: ExportRow[] = [];

  for (const customer of customers) {
    rows.push(buildClientRow(customer));

    const lead = leadsByCustomer.get(customer.id);
    if (lead) rows.push(buildLeadRow(customer, lead));

    for (const job of jobsByCustomer.get(customer.id) ?? []) {
      rows.push(buildJobRow(customer, job));
    }

    for (const quote of quotesByCustomer.get(customer.id) ?? []) {
      rows.push(buildQuoteRow(customer, quote));
      for (const item of lineItemsByQuote.get(quote.id) ?? []) {
        rows.push(buildQuoteLineRow(customer, quote, item));
      }
    }

    for (const invoice of invoicesByCustomer.get(customer.id) ?? []) {
      rows.push(buildInvoiceRow(customer, invoice));
    }
  }

  const sortedRows = sortExportRows(rows);
  const csvRows = sortedRows.map(exportRowToCsv);

  return {
    filename: `TradeKeepCRM-export-${exportedAt}.csv`,
    content: buildCsv(CSV_HEADERS, csvRows),
    rowCount: csvRows.length,
  };
}
