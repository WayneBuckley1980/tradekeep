import { ensureNotificationPermissions } from '@/lib/notifications';
import { scheduleAtNineAm, startOfDay, subtractDays } from '@/lib/dates';
import * as Notifications from 'expo-notifications';
import type { JobNotificationIds } from '@/types/database';

async function scheduleJobNotification(
  title: string,
  body: string,
  triggerDate: Date,
  jobId: string,
  type: string,
): Promise<string | undefined> {
  if (triggerDate <= new Date()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { jobId, type }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function scheduleJobStartReminders(
  jobId: string,
  jobTitle: string,
  startAt: string,
): Promise<JobNotificationIds> {
  await ensureNotificationPermissions();
  const start = new Date(startAt);
  const startDay = startOfDay(start);
  const ids: JobNotificationIds = {};

  const weekBefore = scheduleAtNineAm(startOfDay(subtractDays(startDay, 7)));
  const weekId = await scheduleJobNotification(
    'Job starting next week',
    `${jobTitle} starts in one week`,
    weekBefore,
    jobId,
    'week_before',
  );
  if (weekId) ids.week_before = weekId;

  const dayBefore = scheduleAtNineAm(startOfDay(subtractDays(startDay, 1)));
  const dayId = await scheduleJobNotification(
    'Job starts tomorrow',
    `${jobTitle} starts tomorrow`,
    dayBefore,
    jobId,
    'day_before',
  );
  if (dayId) ids.day_before = dayId;

  return ids;
}

export async function cancelJobStartReminders(ids: JobNotificationIds | null | undefined) {
  if (!ids) return;
  const values = [ids.week_before, ids.day_before].filter(Boolean) as string[];
  await Promise.all(values.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}
