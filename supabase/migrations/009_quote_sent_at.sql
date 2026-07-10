-- Track when a quote was first emailed so Send vs Re-send is accurate after edits.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Backfill quotes already marked sent
UPDATE public.quotes
SET sent_at = updated_at
WHERE status = 'sent' AND sent_at IS NULL;
