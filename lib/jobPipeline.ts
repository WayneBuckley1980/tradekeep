import type { Job, JobPipelineStatus, Quote } from '@/types/database';

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

export type ClientPipelineFocus = {
  status: JobPipelineStatus;
  title: string | null;
  route: string | null;
  nextAction: string;
};

export function pipelineNextActionHint(status: JobPipelineStatus): string {
  switch (status) {
    case 'lead':
      return 'Confirm visit or create a quote';
    case 'quoted':
      return 'Send quote or wait for acceptance';
    case 'active':
      return 'Book start date and complete the work';
    case 'invoiced':
      return 'Record payment to complete the job';
    case 'complete':
    case 'closed':
      return 'Job complete';
    default:
      return 'Continue the workflow';
  }
}

/** Pick the open job/quote that best represents where this client is in the pipeline. */
export function getClientPipelineFocus(jobs: Job[], quotes: Quote[]): ClientPipelineFocus {
  const openJobs = jobs
    .filter((j) => !j.deleted_at && j.pipeline_status !== 'complete')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (openJobs.length > 0) {
    const job = openJobs[0];
    return {
      status: job.pipeline_status,
      title: job.title,
      route: `/job/${job.id}`,
      nextAction: pipelineNextActionHint(job.pipeline_status),
    };
  }

  const openQuote = quotes
    .filter((q) => q.status === 'draft' || q.status === 'sent' || q.status === 'accepted')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  if (openQuote) {
    const status: JobPipelineStatus = openQuote.status === 'accepted' ? 'active' : 'quoted';
    return {
      status,
      title: openQuote.title,
      route: `/quote/${openQuote.id}`,
      nextAction: pipelineNextActionHint(status),
    };
  }

  return {
    status: 'lead',
    title: null,
    route: null,
    nextAction: pipelineNextActionHint('lead'),
  };
}
