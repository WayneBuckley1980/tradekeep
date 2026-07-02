import { generateJobReference } from '@/lib/references';
import { supabase } from '@/lib/supabase';
import type { Job, JobInsert, JobStatus, JobUpdate } from '@/types/database';

export { generateJobReference } from '@/lib/references';

export async function fetchJobs(userId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchJobsForCustomer(userId: string, customerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchJob(userId: string, jobId: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createJob(userId: string, payload: JobInsert): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateJob(userId: string, jobId: string, payload: JobUpdate): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('user_id', userId).eq('id', jobId);
  if (error) throw error;
}

export function isJobToday(scheduledAt: string): boolean {
  const d = new Date(scheduledAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function filterJobsByTab(jobs: Job[], tab: 'upcoming' | 'today' | 'in_progress' | 'completed' | 'cancelled'): Job[] {
  const now = new Date();
  switch (tab) {
    case 'today':
      return jobs.filter((j) => j.status !== 'cancelled' && j.status !== 'completed' && isJobToday(j.scheduled_at));
    case 'upcoming':
      return jobs.filter(
        (j) =>
          j.status === 'upcoming' &&
          !isJobToday(j.scheduled_at) &&
          new Date(j.scheduled_at) >= now,
      );
    case 'in_progress':
      return jobs.filter((j) => j.status === 'in_progress');
    case 'completed':
      return jobs.filter((j) => j.status === 'completed');
    case 'cancelled':
      return jobs.filter((j) => j.status === 'cancelled');
    default:
      return jobs;
  }
}

export function formatJobDateTime(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function duplicateJob(userId: string, job: Job): Promise<Job> {
  const nextWeek = new Date(job.scheduled_at);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return createJob(userId, {
    customer_id: job.customer_id,
    reference: generateJobReference(),
    title: job.title,
    description: job.description,
    scheduled_at: nextWeek.toISOString(),
    duration_minutes: job.duration_minutes,
    address_line1: job.address_line1,
    city: job.city,
    postcode: job.postcode,
    status: 'upcoming',
    price: job.price,
    materials: job.materials,
    notes: job.notes,
    quote_id: null,
    property_id: job.property_id,
  });
}

export async function syncLastAppointmentFromJob(userId: string, customerId: string, job: Job): Promise<void> {
  if (job.status !== 'completed') return;
  const date = job.scheduled_at.split('T')[0];
  await supabase
    .from('customers')
    .update({ last_appointment: date, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', customerId);
}
