-- New jobs should start at Lead, not Active (matches app job creation flow).

ALTER TABLE public.jobs
  ALTER COLUMN pipeline_status SET DEFAULT 'lead'::job_pipeline_status;
