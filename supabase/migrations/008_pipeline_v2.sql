-- TradeKeep v2.5: 5-step pipeline (Lead -> Quoted -> Active -> Invoiced -> Complete/paid)
-- Visit/start scheduling, work completion fields, soft-delete archive
--
-- Uses enum replacement (not ADD VALUE) so this runs in one Supabase SQL Editor transaction.

DROP TRIGGER IF EXISTS enforce_job_pipeline_status_trigger ON public.jobs;
DROP TRIGGER IF EXISTS auto_close_job_on_invoice_paid_trigger ON public.invoices;
DROP TRIGGER IF EXISTS auto_complete_job_on_invoice_paid_trigger ON public.invoices;

CREATE TYPE public.job_pipeline_status_v2 AS ENUM (
  'lead',
  'quoted',
  'active',
  'invoiced',
  'complete'
);

ALTER TABLE public.jobs
  ALTER COLUMN pipeline_status DROP DEFAULT;

ALTER TABLE public.jobs
  ALTER COLUMN pipeline_status TYPE public.job_pipeline_status_v2
  USING (
    CASE pipeline_status::text
      WHEN 'closed' THEN 'complete'::job_pipeline_status_v2
      WHEN 'complete' THEN 'invoiced'::job_pipeline_status_v2
      ELSE pipeline_status::text::job_pipeline_status_v2
    END
  );

ALTER TABLE public.jobs
  ALTER COLUMN pipeline_status SET DEFAULT 'active'::job_pipeline_status_v2;

DROP TYPE public.job_pipeline_status;
ALTER TYPE public.job_pipeline_status_v2 RENAME TO job_pipeline_status;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS visit_required boolean,
  ADD COLUMN IF NOT EXISTS visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_completed_notes text,
  ADD COLUMN IF NOT EXISTS additional_works text,
  ADD COLUMN IF NOT EXISTS additional_materials text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS job_notification_ids jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.enforce_job_pipeline_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.pipeline_status IS NOT DISTINCT FROM old.pipeline_status THEN
    RETURN new;
  END IF;

  IF NOT (
    (old.pipeline_status = 'lead' AND new.pipeline_status = 'quoted') OR
    (old.pipeline_status = 'quoted' AND new.pipeline_status = 'active') OR
    (old.pipeline_status = 'active' AND new.pipeline_status = 'invoiced') OR
    (old.pipeline_status = 'invoiced' AND new.pipeline_status = 'complete')
  ) THEN
    RAISE EXCEPTION 'Invalid pipeline transition from % to %', old.pipeline_status, new.pipeline_status;
  END IF;

  IF new.pipeline_status = 'invoiced' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.job_id = new.id AND i.status NOT IN ('cancelled')
    ) THEN
      RAISE EXCEPTION 'An invoice must be generated before marking the job as invoiced';
    END IF;
  END IF;

  IF new.pipeline_status = 'complete' THEN
    IF EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.job_id = new.id AND i.status NOT IN ('paid', 'cancelled')
    ) THEN
      RAISE EXCEPTION 'Job cannot be complete until full payment is received';
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS enforce_job_pipeline_status_trigger ON public.jobs;
CREATE TRIGGER enforce_job_pipeline_status_trigger
  BEFORE UPDATE OF pipeline_status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_pipeline_status();

CREATE OR REPLACE FUNCTION public.auto_complete_job_on_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.status = 'paid' AND (old.status IS DISTINCT FROM new.status) AND new.job_id IS NOT NULL THEN
    UPDATE public.jobs
    SET pipeline_status = 'complete', status = 'completed'
    WHERE id = new.job_id
      AND pipeline_status = 'invoiced';
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER auto_complete_job_on_invoice_paid_trigger
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_job_on_invoice_paid();
