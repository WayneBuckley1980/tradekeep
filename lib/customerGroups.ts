import { getFollowUpUrgency } from '@/lib/dates';
import type { Customer } from '@/types/database';

export type CustomerSection = {
  title: string;
  data: Customer[];
};

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  return customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(q) ||
      (customer.notes ?? '').toLowerCase().includes(q),
  );
}

export function groupCustomers(customers: Customer[]): CustomerSection[] {
  const chaseToday: Customer[] = [];
  const dueThisWeek: Customer[] = [];
  const allClients: Customer[] = [];

  for (const customer of customers) {
    const urgency = getFollowUpUrgency(customer.follow_up_at);
    if (urgency === 'overdue' || urgency === 'today') {
      chaseToday.push(customer);
    } else if (urgency === 'week') {
      dueThisWeek.push(customer);
    } else {
      allClients.push(customer);
    }
  }

  const sections: CustomerSection[] = [];
  if (chaseToday.length) sections.push({ title: 'Chase today', data: chaseToday });
  if (dueThisWeek.length) sections.push({ title: 'Due this week', data: dueThisWeek });
  if (allClients.length) sections.push({ title: 'All clients', data: allClients });

  return sections;
}

export function sortCustomers(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) => {
    const aDate = a.follow_up_at ?? '9999-12-31';
    const bDate = b.follow_up_at ?? '9999-12-31';
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return a.name.localeCompare(b.name);
  });
}
