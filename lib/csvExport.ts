import { fetchCustomers } from '@/lib/customers';
import { fetchInvoices } from '@/lib/invoices';
import { fetchJobs } from '@/lib/jobs';
import { fetchLeads, leadStatusLabel } from '@/lib/leads';
import { fetchQuotes } from '@/lib/quotes';
import { supabase } from '@/lib/supabase';
import type { Customer, Invoice, Job, Lead, Quote, QuoteLineItem } from '@/types/database';

const UTF8_BOM = '\uFEFF';

export type CsvExportKind = 'clients' | 'leads' | 'jobs' | 'quotes' | 'quote_line_items' | 'invoices';

export type CsvExportCounts = Record<CsvExportKind, number>;

export type CsvExportResult = {
  filename: string;
  content: string;
  rowCount: number;
};

type CsvCell = string | number | boolean | null | undefined;

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

function customerName(customers: Map<string, Customer>, customerId: string): string {
  return customers.get(customerId)?.name ?? '';
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

function lineItemsSummary(items: QuoteLineItem[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `${item.label}: ${formatCsvMoney(Number(item.amount))}`).join('; ');
}

export async function fetchCsvExportCounts(userId: string): Promise<CsvExportCounts> {
  const [customers, leads, jobs, quotes, invoices, lineItems] = await Promise.all([
    fetchCustomers(userId, true),
    fetchLeads(userId),
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchInvoices(userId),
    fetchAllQuoteLineItems(userId),
  ]);

  return {
    clients: customers.length,
    leads: leads.length,
    jobs: jobs.length,
    quotes: quotes.length,
    quote_line_items: lineItems.length,
    invoices: invoices.length,
  };
}

export async function buildCsvExport(userId: string, kind: CsvExportKind): Promise<CsvExportResult> {
  const exportedAt = new Date().toISOString().slice(0, 10);

  switch (kind) {
    case 'clients':
      return buildClientsCsv(userId, exportedAt);
    case 'leads':
      return buildLeadsCsv(userId, exportedAt);
    case 'jobs':
      return buildJobsCsv(userId, exportedAt);
    case 'quotes':
      return buildQuotesCsv(userId, exportedAt);
    case 'quote_line_items':
      return buildQuoteLineItemsCsv(userId, exportedAt);
    case 'invoices':
      return buildInvoicesCsv(userId, exportedAt);
  }
}

async function buildClientsCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const customers = await fetchCustomers(userId, true);
  const headers = [
    'Name',
    'Phone',
    'Email',
    'Address line 1',
    'Address line 2',
    'City',
    'Postcode',
    'Favourite',
    'Next action',
    'Next action due',
    'Follow-up date',
    'Last appointment',
    'Last contacted',
    'Amount paid (GBP)',
    'Rating',
    'Archived',
    'Notes',
    'Created',
    'Updated',
  ];

  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email,
    c.address_line1,
    c.address_line2,
    c.city,
    c.postcode,
    c.is_favourite ? 'Yes' : 'No',
    c.next_action,
    formatCsvDate(c.next_action_due_at),
    formatCsvDate(c.follow_up_at),
    formatCsvDate(c.last_appointment),
    formatCsvDateTime(c.last_contacted_at),
    formatCsvMoney(c.amount_paid),
    c.rating,
    c.archived_at ? formatCsvDate(c.archived_at) : '',
    c.notes,
    formatCsvDateTime(c.created_at),
    formatCsvDateTime(c.updated_at),
  ]);

  return {
    filename: `tradekeep-clients-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

async function buildLeadsCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const leads = await fetchLeads(userId);
  const headers = [
    'Name',
    'Phone',
    'Email',
    'Requested service',
    'Status',
    'Converted to client',
    'Notes',
    'Created',
    'Updated',
  ];

  const rows = leads.map((l: Lead) => [
    l.name,
    l.phone,
    l.email,
    l.requested_service,
    leadStatusLabel(l.status),
    l.converted_customer_id ? 'Yes' : 'No',
    l.notes,
    formatCsvDateTime(l.created_at),
    formatCsvDateTime(l.updated_at),
  ]);

  return {
    filename: `tradekeep-leads-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

async function buildJobsCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const [jobs, customers] = await Promise.all([fetchJobs(userId), fetchCustomers(userId, true)]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const headers = [
    'Reference',
    'Title',
    'Client',
    'Status',
    'Scheduled',
    'Duration (minutes)',
    'Price (GBP)',
    'Address',
    'City',
    'Postcode',
    'Materials',
    'Description',
    'Notes',
    'Created',
    'Updated',
  ];

  const rows = jobs.map((j: Job) => [
    j.reference,
    j.title,
    customerName(customerMap, j.customer_id),
    j.status,
    formatCsvDateTime(j.scheduled_at),
    j.duration_minutes,
    formatCsvMoney(j.price),
    j.address_line1,
    j.city,
    j.postcode,
    j.materials,
    j.description,
    j.notes,
    formatCsvDateTime(j.created_at),
    formatCsvDateTime(j.updated_at),
  ]);

  return {
    filename: `tradekeep-jobs-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

async function buildQuotesCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const [quotes, customers, lineItems] = await Promise.all([
    fetchQuotes(userId),
    fetchCustomers(userId, true),
    fetchAllQuoteLineItems(userId),
  ]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const lineItemsByQuote = new Map<string, QuoteLineItem[]>();
  for (const item of lineItems) {
    const list = lineItemsByQuote.get(item.quote_id) ?? [];
    list.push(item);
    lineItemsByQuote.set(item.quote_id, list);
  }

  const headers = [
    'Reference',
    'Title',
    'Client',
    'Status',
    'Amount (GBP)',
    'Valid until',
    'Line items summary',
    'Description',
    'Created',
    'Updated',
  ];

  const rows = quotes.map((q: Quote) => [
    q.reference,
    q.title,
    customerName(customerMap, q.customer_id),
    q.status,
    formatCsvMoney(Number(q.amount)),
    formatCsvDate(q.valid_until),
    lineItemsSummary(lineItemsByQuote.get(q.id) ?? []),
    q.description,
    formatCsvDateTime(q.created_at),
    formatCsvDateTime(q.updated_at),
  ]);

  return {
    filename: `tradekeep-quotes-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

async function buildQuoteLineItemsCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const [lineItems, quotes, customers] = await Promise.all([
    fetchAllQuoteLineItems(userId),
    fetchQuotes(userId),
    fetchCustomers(userId, true),
  ]);
  const quoteMap = new Map(quotes.map((q) => [q.id, q]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const headers = ['Quote reference', 'Quote title', 'Client', 'Line item', 'Amount (GBP)', 'Sort order'];

  const rows = lineItems.map((item) => {
    const quote = quoteMap.get(item.quote_id);
    return [
      quote?.reference ?? '',
      quote?.title ?? '',
      quote ? customerName(customerMap, quote.customer_id) : '',
      item.label,
      formatCsvMoney(Number(item.amount)),
      item.sort_order,
    ];
  });

  return {
    filename: `tradekeep-quote-line-items-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

async function buildInvoicesCsv(userId: string, exportedAt: string): Promise<CsvExportResult> {
  const [invoices, customers] = await Promise.all([fetchInvoices(userId), fetchCustomers(userId, true)]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const headers = [
    'Reference',
    'Title',
    'Client',
    'Status',
    'Amount (GBP)',
    'Due date',
    'Created',
    'Updated',
  ];

  const rows = invoices.map((i: Invoice) => [
    i.reference,
    i.title,
    customerName(customerMap, i.customer_id),
    i.status,
    formatCsvMoney(Number(i.amount)),
    formatCsvDate(i.due_at),
    formatCsvDateTime(i.created_at),
    formatCsvDateTime(i.updated_at),
  ]);

  return {
    filename: `tradekeep-invoices-${exportedAt}.csv`,
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

export const CSV_EXPORT_OPTIONS: { kind: CsvExportKind; label: string; description: string }[] = [
  { kind: 'clients', label: 'Clients', description: 'Contact details, follow-ups and notes' },
  { kind: 'leads', label: 'Leads', description: 'Enquiries and conversion status' },
  { kind: 'jobs', label: 'Jobs', description: 'Schedule, pricing and job details' },
  { kind: 'quotes', label: 'Quotes', description: 'Totals with line item summary' },
  { kind: 'quote_line_items', label: 'Quote line items', description: 'Individual quote breakdown rows' },
  { kind: 'invoices', label: 'Invoices', description: 'Amounts, status and due dates' },
];
