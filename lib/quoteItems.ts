import { supabase } from '@/lib/supabase';
import type { QuoteLineItem } from '@/types/database';

export async function fetchQuoteLineItems(userId: string, quoteId: string): Promise<QuoteLineItem[]> {
  const { data, error } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('user_id', userId)
    .eq('quote_id', quoteId)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function saveQuoteLineItems(
  userId: string,
  quoteId: string,
  items: { label: string; amount: number }[],
): Promise<number> {
  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId).eq('user_id', userId);

  if (items.length === 0) return 0;

  const rows = items.map((item, index) => ({
    user_id: userId,
    quote_id: quoteId,
    label: item.label,
    amount: item.amount,
    sort_order: index,
  }));

  const { error } = await supabase.from('quote_line_items').insert(rows);
  if (error) throw error;

  return items.reduce((sum, i) => sum + i.amount, 0);
}

export function defaultLineItems(): { label: string; amount: string }[] {
  return [
    { label: 'Labour', amount: '' },
    { label: 'Materials', amount: '' },
    { label: 'Disposal', amount: '' },
  ];
}
