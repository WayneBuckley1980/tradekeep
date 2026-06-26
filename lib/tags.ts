import { supabase } from '@/lib/supabase';
import type { Tag } from '@/types/database';

export async function fetchTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function createTag(userId: string, name: string, color = '#8E8E93'): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: userId, name, color })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('user_id', userId).eq('id', tagId);
  if (error) throw error;
}

export async function fetchTagsForCustomer(customerId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('customer_tags')
    .select('tag_id, tags(*)')
    .eq('customer_id', customerId);

  if (error) throw error;
  return (data ?? []).map((row) => (row as unknown as { tags: Tag }).tags).filter(Boolean);
}

export async function setCustomerTags(customerId: string, tagIds: string[]): Promise<void> {
  await supabase.from('customer_tags').delete().eq('customer_id', customerId);
  if (tagIds.length === 0) return;

  const { error } = await supabase
    .from('customer_tags')
    .insert(tagIds.map((tag_id) => ({ customer_id: customerId, tag_id })));

  if (error) throw error;
}

export const DEFAULT_TAGS = [
  { name: 'Residential', color: '#0A84FF' },
  { name: 'Commercial', color: '#BF5AF2' },
  { name: 'VIP', color: '#FFD60A' },
  { name: 'Late payer', color: '#FF453A' },
  { name: 'Annual service', color: '#34C759' },
];

export async function ensureDefaultTags(userId: string): Promise<void> {
  const existing = await fetchTags(userId);
  if (existing.length > 0) return;

  for (const tag of DEFAULT_TAGS) {
    await createTag(userId, tag.name, tag.color);
  }
}
