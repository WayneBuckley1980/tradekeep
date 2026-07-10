import { getDefaultQuoteLineItems, type QuoteLineItemDraft } from '@/lib/terminology';
import { supabase } from '@/lib/supabase';
import type { BusinessType, QuoteDurationUnit, QuoteLineItem } from '@/types/database';

export type { QuoteLineItemDraft };

export function formatQuoteLineItemLabel(
  label: string,
  durationQty?: number | string | null,
  durationUnit?: QuoteDurationUnit | null,
): string {
  if (!durationQty || !durationUnit) return label;
  const qty = String(durationQty).trim();
  if (!qty || qty === '0') return label;
  return `${label} (${qty} ${durationUnit})`;
}

export function defaultLineItems(businessType?: BusinessType | null): QuoteLineItemDraft[] {
  return getDefaultQuoteLineItems(businessType);
}

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

export type QuoteLineItemSaveRow = {
  label: string;
  amount: number;
  durationQty?: number | null;
  durationUnit?: QuoteDurationUnit | null;
};

export async function saveQuoteLineItems(
  userId: string,
  quoteId: string,
  items: QuoteLineItemSaveRow[],
): Promise<number> {
  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId).eq('user_id', userId);

  if (items.length === 0) return 0;

  const rows = items.map((item, index) => ({
    user_id: userId,
    quote_id: quoteId,
    label: item.label,
    amount: item.amount,
    sort_order: index,
    duration_qty: item.durationQty ?? null,
    duration_unit: item.durationUnit ?? null,
  }));

  const { error } = await supabase.from('quote_line_items').insert(rows);
  if (error) throw error;

  return items.reduce((sum, i) => sum + i.amount, 0);
}

export function lineItemDraftFromDb(item: QuoteLineItem): QuoteLineItemDraft {
  return {
    label: item.label,
    amount: String(item.amount),
    durationQty: item.duration_qty != null ? String(item.duration_qty) : '',
    durationUnit: item.duration_unit ?? '',
  };
}

export function lineItemDraftToSave(row: QuoteLineItemDraft): QuoteLineItemSaveRow {
  return {
    label: row.label.trim(),
    amount: Number(row.amount) || 0,
    durationQty: row.durationQty.trim() ? Number(row.durationQty) : null,
    durationUnit: row.durationUnit || null,
  };
}
