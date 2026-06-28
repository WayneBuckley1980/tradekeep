import { fetchJobsForCustomer } from '@/lib/jobs';
import { fetchCustomerSummary } from '@/lib/money';
import type { Customer, CustomerHealth, Job } from '@/types/database';

const INACTIVE_MONTHS = 14;

export async function getCustomerHealth(userId: string, customer: Customer): Promise<CustomerHealth> {
  const [summary, jobs] = await Promise.all([
    fetchCustomerSummary(userId, customer.id),
    fetchJobsForCustomer(userId, customer.id),
  ]);

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const lastJob = completedJobs[0] ?? null;
  const lastJobDate = lastJob?.scheduled_at ?? customer.last_appointment;

  let monthsSinceWork: number | null = null;
  if (lastJobDate) {
    const last = new Date(lastJobDate);
    const now = new Date();
    monthsSinceWork =
      (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
  }

  const isInactive = monthsSinceWork !== null && monthsSinceWork >= INACTIVE_MONTHS;
  const isVip = customer.is_favourite || (customer.rating ?? 0) >= 4 || summary.totalSpent > 2000;

  return {
    isVip,
    isInactive,
    monthsSinceWork,
    customerSince: customer.created_at.split('T')[0],
    lifetimeSpend: summary.totalSpent,
    jobCount: completedJobs.length,
    outstanding: summary.balanceOwing,
    lastJobTitle: lastJob?.title ?? summary.lastJobTitle,
    lastJobDate: lastJobDate?.split('T')[0] ?? summary.lastJobDate,
    suggestFollowUp: isInactive,
  };
}

export function healthLabel(health: CustomerHealth): string {
  if (health.isVip) return 'VIP';
  if (health.isInactive) return 'Inactive';
  return 'Active';
}

export function ratingStars(rating: number | null | undefined): string {
  if (!rating) return '';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}
