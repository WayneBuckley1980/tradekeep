import { supabase } from '@/lib/supabase';
import { createCustomer } from '@/lib/customers';
import type { Lead, LeadInsert, LeadStatus, LeadUpdate } from '@/types/database';

export async function fetchLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLead(userId: string, leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('id', leadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLead(userId: string, payload: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateLead(userId: string, leadId: string, payload: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', leadId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(userId: string, leadId: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('user_id', userId).eq('id', leadId);
  if (error) throw error;
}

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'quote_sent', 'won', 'lost'];

export function leadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    new: 'New',
    contacted: 'Contacted',
    quote_sent: 'Quote sent',
    won: 'Won',
    lost: 'Lost',
  };
  return labels[status];
}

export async function convertLeadToClient(userId: string, leadId: string) {
  const lead = await fetchLead(userId, leadId);
  if (!lead) throw new Error('Lead not found');
  if (lead.converted_customer_id) {
    throw new Error('Lead already converted');
  }

  const notes = [lead.requested_service ? `Requested: ${lead.requested_service}` : null, lead.notes]
    .filter(Boolean)
    .join('\n\n');

  const customer = await createCustomer(userId, {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    notes: notes || null,
    address_line1: null,
    address_line2: null,
    city: null,
    postcode: null,
    is_favourite: false,
    next_action: null,
    next_action_due_at: null,
    last_appointment: null,
    amount_paid: null,
    follow_up_at: null,
    notification_ids: null,
    rating: null,
    archived_at: null,
    last_contacted_at: null,
    lead_id: lead.id,
    reminder_type: 'fixed_date',
    reminder_offset_days: null,
  });

  await updateLead(userId, leadId, { status: 'won', converted_customer_id: customer.id });
  return customer;
}
