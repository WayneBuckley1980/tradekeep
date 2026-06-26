import type { Customer, Invoice, Job, Payment, Quote, TimelineEntry } from '@/types/database';

export function buildCustomerTimeline(
  jobs: Job[],
  quotes: Quote[],
  invoices: Invoice[],
  payments: Payment[],
  customer: Customer,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const job of jobs) {
    entries.push({
      id: job.id,
      type: 'job',
      title: job.title,
      subtitle: job.status.replace('_', ' '),
      amount: job.price ?? undefined,
      date: job.scheduled_at,
      status: job.status,
    });
  }

  for (const quote of quotes) {
    entries.push({
      id: quote.id,
      type: 'quote',
      title: quote.title,
      subtitle: quote.reference ?? quote.status,
      amount: quote.amount,
      date: quote.created_at,
      status: quote.status,
    });
  }

  for (const invoice of invoices) {
    entries.push({
      id: invoice.id,
      type: 'invoice',
      title: invoice.title,
      subtitle: invoice.reference ?? invoice.status,
      amount: invoice.amount,
      date: invoice.created_at,
      status: invoice.status,
    });
  }

  for (const payment of payments) {
    entries.push({
      id: payment.id,
      type: 'payment',
      title: 'Payment received',
      subtitle: payment.method ?? undefined,
      amount: payment.amount,
      date: payment.paid_at,
    });
  }

  if (customer.notes) {
    entries.push({
      id: `note-${customer.id}`,
      type: 'note',
      title: 'Notes',
      subtitle: customer.notes.slice(0, 80),
      date: customer.updated_at,
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
