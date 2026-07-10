import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export async function ensureCalendarPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const editable = calendars.find((c) => c.allowsModifications);
  return editable?.id ?? calendars[0]?.id ?? null;
}

export async function addJobEventToCalendar(options: {
  title: string;
  startDate: Date;
  durationMinutes?: number;
  notes?: string;
  location?: string;
}): Promise<string | null> {
  const granted = await ensureCalendarPermissions();
  if (!granted) return null;

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return null;

  const endDate = new Date(options.startDate);
  endDate.setMinutes(endDate.getMinutes() + (options.durationMinutes ?? 60));

  return Calendar.createEventAsync(calendarId, {
    title: options.title,
    startDate: options.startDate,
    endDate,
    notes: options.notes,
    location: options.location,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
