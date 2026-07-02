-- TradeKeep v2.3: job references and one-invoice-per-quote/job enforcement

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reference text;

-- Each quote may only be linked to one invoice
CREATE UNIQUE INDEX IF NOT EXISTS invoices_quote_id_unique
  ON invoices (quote_id)
  WHERE quote_id IS NOT NULL;

-- Each job may only be linked to one invoice
CREATE UNIQUE INDEX IF NOT EXISTS invoices_job_id_unique
  ON invoices (job_id)
  WHERE job_id IS NOT NULL;
