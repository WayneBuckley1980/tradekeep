import { addDays, formatDateOnly, parseDateOnly, startOfDay } from '@/lib/dates';
import type { Customer, ReminderType } from '@/types/database';

export const REMINDER_PRESETS: { id: ReminderType; label: string; description: string }[] = [
  { id: 'fixed_date', label: 'Pick a date', description: 'Set a specific follow-up date' },
  { id: 'tomorrow', label: 'Tomorrow', description: 'Remind you tomorrow at 9am' },
  { id: 'next_week', label: 'Next week', description: 'Remind you in 7 days' },
  { id: 'after_job', label: 'After job', description: 'Schedule when a job completes' },
  { id: 'after_paid', label: 'After paid', description: 'Schedule when invoice is paid' },
  { id: 'annual', label: 'Annual', description: 'Same date next year' },
  { id: 'days_after_install', label: 'Days after install', description: 'Offset from install date' },
];

export function computeFollowUpDate(
  reminderType: ReminderType,
  options: {
    fixedDate?: string | null;
    offsetDays?: number | null;
    referenceDate?: string | null;
  } = {},
): string | null {
  const today = startOfDay(new Date());

  switch (reminderType) {
    case 'fixed_date':
      return options.fixedDate ?? null;
    case 'tomorrow':
      return formatDateOnly(addDays(today, 1));
    case 'next_week':
      return formatDateOnly(addDays(today, 7));
    case 'annual': {
      const base = parseDateOnly(options.fixedDate ?? options.referenceDate);
      if (!base) return formatDateOnly(addDays(today, 365));
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      return formatDateOnly(next);
    }
    case 'days_after_install': {
      const install = parseDateOnly(options.referenceDate);
      if (!install || !options.offsetDays) return null;
      return formatDateOnly(addDays(install, options.offsetDays));
    }
    case 'after_job':
    case 'after_paid':
      return null;
    default:
      return options.fixedDate ?? null;
  }
}

export function resolveCustomerFollowUp(customer: Pick<Customer, 'reminder_type' | 'follow_up_at' | 'reminder_offset_days' | 'last_appointment'>): string | null {
  if (customer.reminder_type === 'after_job' || customer.reminder_type === 'after_paid') {
    return customer.follow_up_at;
  }
  if (customer.reminder_type && customer.reminder_type !== 'fixed_date') {
    return computeFollowUpDate(customer.reminder_type, {
      fixedDate: customer.follow_up_at,
      offsetDays: customer.reminder_offset_days,
      referenceDate: customer.last_appointment,
    });
  }
  return customer.follow_up_at;
}
