import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatDateOnly, parseDateOnly, scheduleAtNineAm, startOfDay, subtractDays } from '@/lib/dates';
import { computeFollowUpDate } from '@/lib/reminders';
import type { Customer, NotificationIds } from '@/types/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data: Record<string, string>,
): Promise<string | undefined> {
  const now = new Date();
  if (triggerDate <= now) return undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelNotificationIds(ids: NotificationIds | null | undefined) {
  if (!ids) return;

  const values = [ids.week_before, ids.day_of].filter(Boolean) as string[];
  await Promise.all(values.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleFollowUpNotifications(
  customer: Pick<Customer, 'id' | 'name' | 'follow_up_at' | 'reminder_type' | 'reminder_offset_days' | 'last_appointment'>,
): Promise<NotificationIds> {
  const followUpStr =
    computeFollowUpDate(customer.reminder_type ?? 'fixed_date', {
      fixedDate: customer.follow_up_at,
      offsetDays: customer.reminder_offset_days,
      referenceDate: customer.last_appointment,
    }) ?? customer.follow_up_at;
  const followUp = parseDateOnly(followUpStr);
  if (!followUp) {
    return {};
  }

  const ids: NotificationIds = {};
  const today = startOfDay(new Date());
  const followUpDay = startOfDay(followUp);
  const daysUntil = Math.round((followUpDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const dayOfTrigger = scheduleAtNineAm(followUpDay);
  if (daysUntil !== null && daysUntil >= 0) {
    const dayOfId = await scheduleNotification(
      'Time to follow up',
      `Time to follow up with ${customer.name}`,
      dayOfTrigger > new Date() ? dayOfTrigger : new Date(Date.now() + 5000),
      { customerId: customer.id, type: 'day_of' },
    );
    if (dayOfId) ids.day_of = dayOfId;
  }

  const weekBeforeDay = startOfDay(subtractDays(followUpDay, 7));
  if (weekBeforeDay > today) {
    const weekBeforeTrigger = scheduleAtNineAm(weekBeforeDay);
    const weekBeforeId = await scheduleNotification(
      'Follow up next week',
      `Follow up with ${customer.name} next week`,
      weekBeforeTrigger,
      { customerId: customer.id, type: 'week_before' },
    );
    if (weekBeforeId) ids.week_before = weekBeforeId;
  }

  return ids;
}

export async function resyncAllFollowUpNotifications(
  customers: Customer[],
  onUpdate: (customerId: string, notification_ids: NotificationIds) => Promise<void>,
) {
  for (const customer of customers) {
    if (!customer.follow_up_at && customer.reminder_type === 'fixed_date') continue;
    const followUpStr = computeFollowUpDate(customer.reminder_type ?? 'fixed_date', {
      fixedDate: customer.follow_up_at,
      offsetDays: customer.reminder_offset_days,
      referenceDate: customer.last_appointment,
    });
    const followUp = parseDateOnly(followUpStr ?? customer.follow_up_at);
    if (!followUp) continue;

    const today = startOfDay(new Date());
    const days = Math.round((startOfDay(followUp).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) continue;

    await cancelNotificationIds(customer.notification_ids);
    const notification_ids = await scheduleFollowUpNotifications({
      ...customer,
      follow_up_at: formatDateOnly(followUp),
    });
    await onUpdate(customer.id, notification_ids);
  }
}
