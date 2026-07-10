import type { JobPipelineStatus } from '@/types/database';

export const PIPELINE_ORDER: JobPipelineStatus[] = ['lead', 'quoted', 'active', 'complete', 'closed'];

export const PIPELINE_LABELS: Record<JobPipelineStatus, string> = {
  lead: 'Lead',
  quoted: 'Quoted',
  active: 'Active',
  complete: 'Complete',
  closed: 'Closed',
};

const ALLOWED: Record<JobPipelineStatus, JobPipelineStatus[]> = {
  lead: ['quoted'],
  quoted: ['active'],
  active: ['complete'],
  complete: ['closed'],
  closed: [],
};

export function canTransitionPipeline(from: JobPipelineStatus, to: JobPipelineStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function nextPipelineStatus(current: JobPipelineStatus): JobPipelineStatus | null {
  return ALLOWED[current][0] ?? null;
}

export function pipelineStatusIndex(status: JobPipelineStatus): number {
  return PIPELINE_ORDER.indexOf(status);
}

/** Map Supabase/Postgres errors to user-friendly alerts. */
export function pipelineErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('An invoice must be generated')) {
      return 'Cannot complete this job until an invoice has been raised.';
    }
    if (msg.includes('Job cannot be closed until full payment')) {
      return 'Cannot close this job until the invoice is fully paid.';
    }
    if (msg.includes('Invalid pipeline transition')) {
      return 'This status change is not allowed. Follow the workflow: Lead → Quoted → Active → Complete → Closed.';
    }
    return msg;
  }
  return 'Something went wrong updating the job status.';
}
