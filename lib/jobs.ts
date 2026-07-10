import { generateJobReference } from '@/lib/references';
import { nextPipelineStatus, pipelineStatusIndex } from '@/lib/jobPipeline';
import { supabase } from '@/lib/supabase';
import type { Job, JobInsert, JobPipelineStatus, JobStatus, JobUpdate } from '@/types/database';

export { generateJobReference } from '@/lib/references';

export async function fetchJobs(userId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchArchivedJobs(userId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function archiveJob(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', jobId);
  if (error) throw error;
}

export async function permanentlyDeleteJob(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('user_id', userId).eq('id', jobId);
  if (error) throw error;
}

export async function fetchJobsForCustomer(userId: string, customerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
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

export async function fetchJobForQuote(userId: string, quoteId: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('quote_id', quoteId)
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

export async function updateJobPipeline(
  userId: string,
  jobId: string,
  pipelineStatus: Job['pipeline_status'],
): Promise<Job> {
  return updateJob(userId, jobId, { pipeline_status: pipelineStatus });
}

/** Advance a job one step at a time through the pipeline (required by DB trigger). */
export async function advanceJobPipelineTo(
  userId: string,
  jobId: string,
  fromStatus: JobPipelineStatus,
  targetStatus: JobPipelineStatus,
  finalPatch?: JobUpdate,
): Promise<Job> {
  const targetIdx = pipelineStatusIndex(targetStatus);
  let status = fromStatus;
  let job: Job | null = null;

  if (pipelineStatusIndex(status) > targetIdx) {
    if (finalPatch && Object.keys(finalPatch).length > 0) {
      return updateJob(userId, jobId, finalPatch);
    }
    const existing = await fetchJob(userId, jobId);
    if (!existing) throw new Error('Job not found');
    return existing;
  }

  while (pipelineStatusIndex(status) < targetIdx) {
    const next = nextPipelineStatus(status);
    if (!next) {
      throw new Error(`Invalid pipeline transition from ${status} toward ${targetStatus}`);
    }
    const reachingTarget = pipelineStatusIndex(next) === targetIdx;
    const patch: JobUpdate =
      reachingTarget && finalPatch ? { pipeline_status: next, ...finalPatch } : { pipeline_status: next };
    job = await updateJob(userId, jobId, patch);
    status = next;
    if (reachingTarget) return job;
  }

  if (finalPatch && Object.keys(finalPatch).length > 0) {
    return updateJob(userId, jobId, finalPatch);
  }

  if (job) return job;
  const existing = await fetchJob(userId, jobId);
  if (!existing) throw new Error('Job not found');
  return existing;
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  await archiveJob(userId, jobId);
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
      return jobs.filter(
        (j) =>
          j.pipeline_status !== 'complete' &&
          j.status !== 'cancelled' &&
          isJobToday(j.start_at ?? j.scheduled_at),
      );
    case 'upcoming':
      return jobs.filter((j) => {
        if (j.status === 'cancelled' || j.pipeline_status === 'complete') return false;
        if (j.pipeline_status === 'lead' || j.pipeline_status === 'quoted') return true;
        return (
          j.pipeline_status === 'active' &&
          j.status === 'upcoming' &&
          !isJobToday(j.start_at ?? j.scheduled_at) &&
          new Date(j.start_at ?? j.scheduled_at) >= now
        );
      });
    case 'in_progress':
      return jobs.filter((j) => j.status === 'in_progress' || j.pipeline_status === 'invoiced');
    case 'completed':
      return jobs.filter((j) => j.pipeline_status === 'complete');
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
    pipeline_status: 'active',
    price: job.price,
    materials: job.materials,
    notes: job.notes,
    visit_required: null,
    visit_at: null,
    start_at: nextWeek.toISOString(),
    work_completed_notes: null,
    additional_works: null,
    additional_materials: null,
    deleted_at: null,
    job_notification_ids: null,
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
