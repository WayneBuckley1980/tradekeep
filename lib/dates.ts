export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(value: string | null): string {
  const date = parseDateOnly(value);
  if (!date) return 'Not set';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(value: string | null): string {
  const date = parseDateOnly(value);
  if (!date) return 'No visit recorded';

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  if (diffDays < 0) {
    const ahead = Math.abs(diffDays);
    if (ahead === 1) return 'Tomorrow';
    return `In ${ahead} days`;
  }
  return formatDisplayDate(value);
}

export function daysUntilFollowUp(value: string | null): number | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export type FollowUpUrgency = 'none' | 'overdue' | 'today' | 'week' | 'later';

export function getFollowUpUrgency(value: string | null): FollowUpUrgency {
  const days = daysUntilFollowUp(value);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'later';
}

export function followUpLabel(value: string | null): string {
  const days = daysUntilFollowUp(value);
  if (days === null) return 'No follow-up set';
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Follow up today';
  if (days === 1) return 'Follow up tomorrow';
  return `Follow up in ${days} days`;
}

export function scheduleAtNineAm(date: Date): Date {
  const scheduled = new Date(date);
  scheduled.setHours(9, 0, 0, 0);
  return scheduled;
}

export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
