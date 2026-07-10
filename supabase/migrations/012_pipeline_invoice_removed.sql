-- Allow invoiced -> active when the job no longer has a live invoice (e.g. invoice deleted).

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
    (old.pipeline_status = 'invoiced' AND new.pipeline_status = 'complete') OR
    (
      old.pipeline_status = 'invoiced'
      AND new.pipeline_status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.job_id = new.id AND i.status NOT IN ('cancelled')
      )
    )
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
