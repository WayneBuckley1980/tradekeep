import type { JobPipelineStatus } from '@/types/database';

export const PIPELINE_ORDER: JobPipelineStatus[] = ['lead', 'quoted', 'active', 'invoiced', 'complete'];

export const PIPELINE_LABELS: Record<JobPipelineStatus, string> = {
  lead: 'Lead',
  quoted: 'Quoted',
  active: 'Active',
  invoiced: 'Invoiced',
  complete: 'Complete',
  closed: 'Complete',
};

const ALLOWED: Record<JobPipelineStatus, JobPipelineStatus[]> = {
  lead: ['quoted'],
  quoted: ['active'],
  active: ['invoiced'],
  invoiced: ['complete'],
  complete: [],
  closed: [],
};

export function canTransitionPipeline(from: JobPipelineStatus, to: JobPipelineStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function nextPipelineStatus(current: JobPipelineStatus): JobPipelineStatus | null {
  if (current === 'closed') return null;
  return ALLOWED[current][0] ?? null;
}

export function pipelineStatusIndex(status: JobPipelineStatus): number {
  if (status === 'closed') return PIPELINE_ORDER.indexOf('complete');
  const idx = PIPELINE_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function pipelineErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('An invoice must be generated')) {
      return 'Cannot mark invoiced until an invoice has been raised.';
    }
    if (msg.includes('Job cannot be complete until full payment')) {
      return 'Cannot complete this job until the invoice is fully paid.';
    }
    if (msg.includes('Invalid pipeline transition')) {
      return 'This status change is not allowed. Follow: Lead → Quoted → Active → Invoiced → Complete.';
    }
    return msg;
  }
  return 'Something went wrong updating the job status.';
}
