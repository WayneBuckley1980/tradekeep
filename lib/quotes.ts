import { supabase } from '@/lib/supabase';
import type { Quote, QuoteInsert, QuoteUpdate } from '@/types/database';

export async function fetchQuotes(userId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchQuotesForCustomer(userId: string, customerId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchQuote(userId: string, quoteId: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', quoteId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createQuote(userId: string, payload: QuoteInsert): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuote(userId: string, quoteId: string, payload: QuoteUpdate): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', quoteId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuote(userId: string, quoteId: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('user_id', userId).eq('id', quoteId);
  if (error) throw error;
}

export function generateReference(prefix: string): string {
  const n = Date.now().toString(36).toUpperCase();
  return `${prefix}-${n.slice(-6)}`;
}
