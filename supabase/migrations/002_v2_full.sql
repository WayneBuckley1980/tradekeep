-- TradeKeep v2: expanded clients, jobs, money, tags, attachments

-- Profiles: business info
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_phone text;
alter table public.profiles add column if not exists business_email text;

-- Customers: contact + next action
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists address_line1 text;
alter table public.customers add column if not exists address_line2 text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists postcode text;
alter table public.customers add column if not exists is_favourite boolean not null default false;
alter table public.customers add column if not exists next_action text;
alter table public.customers add column if not exists next_action_due_at date;

create index if not exists customers_is_favourite_idx on public.customers (user_id, is_favourite);
create index if not exists customers_next_action_due_at_idx on public.customers (next_action_due_at);

-- Jobs
create type job_status as enum ('upcoming', 'in_progress', 'completed', 'cancelled');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes integer,
  address_line1 text,
  city text,
  postcode text,
  status job_status not null default 'upcoming',
  price numeric(10, 2),
  materials text,
  notes text,
  quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_user_scheduled_idx on public.jobs (user_id, scheduled_at);
create index jobs_user_status_idx on public.jobs (user_id, status);
create index jobs_customer_idx on public.jobs (customer_id);

-- Quotes & invoices
create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  reference text,
  title text not null,
  description text,
  amount numeric(10, 2) not null,
  status quote_status not null default 'draft',
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  reference text,
  title text not null,
  amount numeric(10, 2) not null,
  status invoice_status not null default 'draft',
  due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs
  add constraint jobs_quote_id_fkey foreign key (quote_id) references public.quotes (id) on delete set null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  job_id uuid references public.jobs (id) on delete set null,
  amount numeric(10, 2) not null,
  paid_at timestamptz not null default now(),
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create index quotes_user_idx on public.quotes (user_id, created_at desc);
create index invoices_user_idx on public.invoices (user_id, created_at desc);
create index invoices_due_idx on public.invoices (user_id, due_at);
create index payments_user_idx on public.payments (user_id, paid_at desc);

-- Tags
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null default '#8E8E93',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.customer_tags (
  customer_id uuid references public.customers (id) on delete cascade,
  tag_id uuid references public.tags (id) on delete cascade,
  primary key (customer_id, tag_id)
);

-- Attachments
create type attachment_kind as enum ('photo_before', 'photo_after', 'pdf', 'other');

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete cascade,
  kind attachment_kind not null,
  storage_path text not null,
  file_name text,
  caption text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.jobs enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.tags enable row level security;
alter table public.customer_tags enable row level security;
alter table public.attachments enable row level security;

create policy "Users manage own jobs" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own quotes" on public.quotes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own invoices" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own payments" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tags" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own customer_tags" on public.customer_tags for all
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));

create policy "Users manage own attachments" on public.attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Updated_at triggers
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

-- Storage bucket (run in Supabase dashboard if this fails)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "Users upload own attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own attachments"
  on storage.objects for select
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own attachments"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
