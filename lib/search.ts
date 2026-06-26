import { fetchCustomers } from '@/lib/customers';
import { fetchInvoices } from '@/lib/invoices';
import { fetchJobs } from '@/lib/jobs';
import { fetchQuotes } from '@/lib/quotes';
import type { Customer, Invoice, Job, Quote } from '@/types/database';

export type SearchResult = {
  id: string;
  type: 'client' | 'job' | 'quote' | 'invoice';
  title: string;
  subtitle: string;
  route: string;
};

function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}

export async function searchAll(userId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [customers, jobs, quotes, invoices] = await Promise.all([
    fetchCustomers(userId),
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchInvoices(userId),
  ]);

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const results: SearchResult[] = [];

  for (const c of customers) {
    if (
      matches(q, c.name, c.phone, c.email, c.notes, c.address_line1, c.city, c.postcode, c.next_action)
    ) {
      results.push({
        id: c.id,
        type: 'client',
        title: c.name,
        subtitle: c.phone ?? c.email ?? c.notes?.slice(0, 40) ?? 'Client',
        route: `/customer/${c.id}`,
      });
    }
  }

  for (const j of jobs) {
    const client = customerMap.get(j.customer_id);
    if (matches(q, j.title, j.description, j.notes, j.materials, client?.name)) {
      results.push({
        id: j.id,
        type: 'job',
        title: j.title,
        subtitle: client?.name ?? 'Job',
        route: `/job/${j.id}`,
      });
    }
  }

  for (const quote of quotes) {
    const client = customerMap.get(quote.customer_id);
    if (matches(q, quote.title, quote.description, quote.reference, client?.name)) {
      results.push({
        id: quote.id,
        type: 'quote',
        title: quote.title,
        subtitle: client?.name ?? 'Quote',
        route: `/quote/${quote.id}`,
      });
    }
  }

  for (const inv of invoices) {
    const client = customerMap.get(inv.customer_id);
    if (matches(q, inv.title, inv.reference, client?.name)) {
      results.push({
        id: inv.id,
        type: 'invoice',
        title: inv.title,
        subtitle: client?.name ?? 'Invoice',
        route: `/invoice/${inv.id}`,
      });
    }
  }

  return results.slice(0, 50);
}

export function formatAddress(c: Pick<Customer, 'address_line1' | 'address_line2' | 'city' | 'postcode'>): string {
  return [c.address_line1, c.address_line2, c.city, c.postcode].filter(Boolean).join(', ');
}
