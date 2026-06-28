import { supabase } from '@/lib/supabase';
import type { JobTemplate } from '@/types/database';

export async function fetchJobTemplates(userId: string): Promise<JobTemplate[]> {
  const { data, error } = await supabase
    .from('job_templates')
    .select('*')
    .eq('user_id', userId)
    .order('title');
  if (error) throw error;
  return data ?? [];
}

export async function createJobTemplate(
  userId: string,
  payload: Omit<JobTemplate, 'id' | 'user_id' | 'created_at'>,
): Promise<JobTemplate> {
  const { data, error } = await supabase
    .from('job_templates')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function seedDefaultTemplates(userId: string, templates: Omit<JobTemplate, 'id' | 'user_id' | 'created_at'>[]) {
  const existing = await fetchJobTemplates(userId);
  if (existing.length > 0) return;
  for (const t of templates) {
    await createJobTemplate(userId, t);
  }
}
