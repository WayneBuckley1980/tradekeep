-- Optional duration per quote line (e.g. 4 weeks of dog walking, 60 mins groom)

ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS duration_qty numeric,
  ADD COLUMN IF NOT EXISTS duration_unit text
    CHECK (duration_unit IS NULL OR duration_unit IN ('mins', 'days', 'weeks', 'months'));
