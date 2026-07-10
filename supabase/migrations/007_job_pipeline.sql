-- TradeKeep v2.4: strict job pipeline (Lead -> Quoted -> Active -> Complete -> Closed)
-- Uses existing quotes/invoices tables as document records (no separate documents table).

create type job_pipeline_status as enum ('lead', 'quoted', 'active', 'complete', 'closed');

alter table public.jobs
  add column if not exists pipeline_status job_pipeline_status not null default 'active';

alter table public.profiles add column if not exists business_address_line1 text;
alter table public.profiles add column if not exists business_address_line2 text;
alter table public.profiles add column if not exists business_city text;
alter table public.profiles add column if not exists business_postcode text;

-- Backfill pipeline from existing invoices
update public.jobs j
set pipeline_status = 'closed'
where exists (
  select 1 from public.invoices i
  where i.job_id = j.id and i.status = 'paid'
);

update public.jobs j
set pipeline_status = 'complete'
where pipeline_status <> 'closed'
  and exists (
    select 1 from public.invoices i
    where i.job_id = j.id and i.status not in ('paid', 'cancelled')
  );

-- Enforce ordered pipeline transitions and invoice/payment rules
create or replace function public.enforce_job_pipeline_status()
returns trigger
language plpgsql
as $$
declare
  allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if new.pipeline_status is not distinct from old.pipeline_status then
    return new;
  end if;

  -- Ordered transitions only (no skipping)
  allowed := (
    (old.pipeline_status = 'lead' and new.pipeline_status = 'quoted') or
    (old.pipeline_status = 'quoted' and new.pipeline_status = 'active') or
    (old.pipeline_status = 'active' and new.pipeline_status = 'complete') or
    (old.pipeline_status = 'complete' and new.pipeline_status = 'closed')
  );

  if not allowed then
    raise exception 'Invalid pipeline transition from % to %', old.pipeline_status, new.pipeline_status;
  end if;

  if new.pipeline_status = 'complete' then
    if not exists (
      select 1 from public.invoices i
      where i.job_id = new.id and i.status <> 'cancelled'
    ) then
      raise exception 'An invoice must be generated before completing this job';
    end if;
  end if;

  if new.pipeline_status = 'closed' then
    if exists (
      select 1 from public.invoices i
      where i.job_id = new.id and i.status not in ('paid', 'cancelled')
    ) then
      raise exception 'Job cannot be closed until full payment is received';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_job_pipeline_status_trigger on public.jobs;
create trigger enforce_job_pipeline_status_trigger
  before update of pipeline_status on public.jobs
  for each row
  execute function public.enforce_job_pipeline_status();

-- Auto-close job when linked invoice is marked paid
create or replace function public.auto_close_job_on_invoice_paid()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and (old.status is distinct from new.status) and new.job_id is not null then
    update public.jobs
    set pipeline_status = 'closed'
    where id = new.job_id
      and pipeline_status = 'complete';
  end if;
  return new;
end;
$$;

drop trigger if exists auto_close_job_on_invoice_paid_trigger on public.invoices;
create trigger auto_close_job_on_invoice_paid_trigger
  after update of status on public.invoices
  for each row
  execute function public.auto_close_job_on_invoice_paid();
