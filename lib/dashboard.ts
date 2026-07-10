import { fetchCustomers } from '@/lib/customers';
import { fetchInvoices } from '@/lib/invoices';
import { effectiveInvoiceStatus } from '@/lib/invoices';
import { fetchJobs } from '@/lib/jobs';
import { fetchLeads } from '@/lib/leads';
import { fetchMoneyStats } from '@/lib/money';
import { fetchQuotes } from '@/lib/quotes';
import type { DashboardKpis, SmartHomeItem } from '@/types/database';

export async function fetchDashboardKpis(userId: string): Promise<DashboardKpis> {
  const [stats, jobs, quotes, customers] = await Promise.all([
    fetchMoneyStats(userId),
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchCustomers(userId),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const jobsThisMonth = jobs.filter((j) => new Date(j.scheduled_at) >= monthStart).length;
  const waitingQuotes = quotes.filter((q) => q.status === 'sent').length;
  const wonQuotes = quotes.filter((q) => q.status === 'accepted').length;
  const decided = quotes.filter((q) => q.status === 'accepted' || q.status === 'rejected').length;
  const winRate = decided > 0 ? Math.round((wonQuotes / decided) * 100) : 0;

  const returningCustomers = customers.filter((c) => {
    const created = new Date(c.created_at);
    return created < monthStart && c.last_appointment;
  }).length;
  const returningRate = customers.length > 0 ? Math.round((returningCustomers / customers.length) * 100) : 0;

  return {
    jobsThisMonth,
    revenueThisMonth: stats.paidThisMonth,
    outstanding: stats.outstanding,
    quotesWaiting: waitingQuotes,
    winRate,
    averageJob: stats.averageJobValue,
    returningCustomers: returningRate,
  };
}

export async function fetchSmartHomeItems(userId: string): Promise<SmartHomeItem[]> {
  const [jobs, quotes, invoices, customers, leads] = await Promise.all([
    fetchJobs(userId),
    fetchQuotes(userId),
    fetchInvoices(userId),
    fetchCustomers(userId),
    fetchLeads(userId),
  ]);

  const items: SmartHomeItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const job of jobs) {
    const d = new Date(job.scheduled_at);
    if (job.status !== 'completed' && job.status !== 'cancelled' && d >= today && d < tomorrow) {
      items.push({
        id: `job-${job.id}`,
        icon: '',
        title: `${job.title} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        route: `/job/${job.id}`,
        priority: 1,
      });
    }
  }

  for (const c of customers) {
    if (c.next_action && c.next_action_due_at) {
      const due = new Date(c.next_action_due_at);
      if (due <= tomorrow) {
        items.push({
          id: `action-${c.id}`,
          icon: '',
          title: `${c.next_action} — ${c.name}`,
          route: `/customer/${c.id}`,
          priority: 2,
        });
      }
    }
  }

  for (const inv of invoices) {
    if (effectiveInvoiceStatus(inv) === 'overdue') {
      items.push({
        id: `inv-${inv.id}`,
        icon: '',
        title: `Invoice £${Number(inv.amount).toFixed(0)} overdue — ${inv.title}`,
        route: `/invoice/${inv.id}`,
        priority: 3,
      });
    }
  }

  for (const q of quotes) {
    if (q.valid_until) {
      const exp = new Date(q.valid_until);
      const diff = Math.round((exp.getTime() - today.getTime()) / (86400000));
      if (diff >= 0 && diff <= 1 && q.status === 'sent') {
        items.push({
          id: `quote-${q.id}`,
          icon: '',
          title: `Quote expires ${diff === 0 ? 'today' : 'tomorrow'} — ${q.title}`,
          route: `/quote/${q.id}`,
          priority: 4,
        });
      }
    }
  }

  for (const lead of leads.filter((l) => l.status === 'new').slice(0, 3)) {
    items.push({
      id: `lead-${lead.id}`,
      icon: '',
      title: `New enquiry: ${lead.name}`,
      route: `/lead/${lead.id}`,
      priority: 5,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
