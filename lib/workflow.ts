import type { Invoice, Job, Quote } from '@/types/database';

export type WorkflowStage = 'quote' | 'order' | 'work' | 'invoice' | 'closed';

export type WorkflowItem = {
  id: string;
  kind: 'quote' | 'job' | 'invoice';
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string;
  date: string;
};

export const WORKFLOW_STAGES: WorkflowStage[] = ['quote', 'order', 'work', 'invoice', 'closed'];

export function buildCustomerWorkflow(
  quotes: Quote[],
  jobs: Job[],
  invoices: Invoice[],
): Record<WorkflowStage, WorkflowItem[]> {
  const paidInvoiceJobIds = new Set(
    invoices.filter((i) => i.status === 'paid').map((i) => i.job_id).filter(Boolean),
  );
  const openInvoiceJobIds = new Set(
    invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
      .map((i) => i.job_id)
      .filter(Boolean),
  );

  const quoteItems: WorkflowItem[] = quotes
    .filter((q) => q.status === 'draft' || q.status === 'sent')
    .map((q) => ({
      id: q.id,
      kind: 'quote' as const,
      title: q.title,
      subtitle: q.reference ?? undefined,
      amount: Number(q.amount),
      status: q.status,
      date: q.created_at,
    }));

  const orderItems: WorkflowItem[] = [
    ...quotes
      .filter((q) => q.status === 'accepted')
      .map((q) => ({
        id: q.id,
        kind: 'quote' as const,
        title: q.title,
        subtitle: 'Order agreed',
        amount: Number(q.amount),
        status: q.status,
        date: q.updated_at,
      })),
    ...jobs
      .filter((j) => j.status === 'upcoming' || j.status === 'in_progress')
      .map((j) => ({
        id: j.id,
        kind: 'job' as const,
        title: j.title,
        subtitle: j.reference ?? undefined,
        amount: j.price != null ? Number(j.price) : undefined,
        status: j.status,
        date: j.scheduled_at,
      })),
  ];

  const workItems: WorkflowItem[] = jobs
    .filter(
      (j) =>
        j.status === 'completed' &&
        !openInvoiceJobIds.has(j.id) &&
        !paidInvoiceJobIds.has(j.id),
    )
    .map((j) => ({
      id: j.id,
      kind: 'job' as const,
      title: j.title,
      subtitle: 'Work completed',
      amount: j.price != null ? Number(j.price) : undefined,
      status: j.status,
      date: j.updated_at,
    }));

  const invoiceItems: WorkflowItem[] = invoices
    .filter((i) => i.status === 'draft' || i.status === 'sent' || i.status === 'overdue')
    .map((i) => ({
      id: i.id,
      kind: 'invoice' as const,
      title: i.title,
      subtitle: i.reference ?? undefined,
      amount: Number(i.amount),
      status: i.status,
      date: i.created_at,
    }));

  const closedItems: WorkflowItem[] = [
    ...invoices
      .filter((i) => i.status === 'paid')
      .map((i) => ({
        id: i.id,
        kind: 'invoice' as const,
        title: i.title,
        subtitle: 'Paid',
        amount: Number(i.amount),
        status: i.status,
        date: i.updated_at,
      })),
    ...jobs
      .filter((j) => j.status === 'completed' && paidInvoiceJobIds.has(j.id))
      .map((j) => ({
        id: j.id,
        kind: 'job' as const,
        title: j.title,
        subtitle: 'Job closed',
        amount: j.price != null ? Number(j.price) : undefined,
        status: j.status,
        date: j.updated_at,
      })),
  ];

  return {
    quote: quoteItems,
    order: orderItems,
    work: workItems,
    invoice: invoiceItems,
    closed: closedItems,
  };
}

export function workflowItemRoute(item: WorkflowItem): string {
  if (item.kind === 'quote') return `/quote/${item.id}`;
  if (item.kind === 'job') return `/job/${item.id}`;
  return `/invoice/${item.id}`;
}
