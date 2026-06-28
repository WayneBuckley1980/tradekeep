import { supabase } from '@/lib/supabase';
import type { CommunicationLog, CommunicationType } from '@/types/database';

export async function fetchCommunicationLogs(userId: string, customerId: string): Promise<CommunicationLog[]> {
  const { data, error } = await supabase
    .from('communication_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function logCommunication(
  userId: string,
  customerId: string,
  type: CommunicationType,
  notes?: string,
): Promise<CommunicationLog> {
  const { data, error } = await supabase
    .from('communication_logs')
    .insert({ user_id: userId, customer_id: customerId, type, notes: notes ?? null })
    .select('*')
    .single();
  if (error) throw error;

  await supabase
    .from('customers')
    .update({ last_contacted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', customerId);

  return data;
}

export const COMM_TYPES: { id: CommunicationType; label: string }[] = [
  { id: 'called', label: 'Called' },
  { id: 'texted', label: 'Texted' },
  { id: 'emailed', label: 'Emailed' },
  { id: 'visited', label: 'Visited' },
  { id: 'voicemail', label: 'Left voicemail' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'other', label: 'Other' },
];
