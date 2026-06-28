-- TradeKeep v2.1: leads, business profile, templates, quote items, comm log

create type business_type as enum (
  'trades', 'hair', 'beauty', 'pt', 'photographer', 'dog_groomer',
  'cleaning', 'gardening', 'tutor', 'mechanic', 'freelance', 'property', 'other'
);

create type work_location_type as enum (
  'visit_customers', 'customers_visit', 'both', 'online'
);

create type lead_status as enum (
  'new', 'contacted', 'quote_sent', 'won', 'lost'
);

create type communication_type as enum (
  'called', 'texted', 'emailed', 'visited', 'voicemail', 'whatsapp', 'other'
);

create type reminder_type as enum (
  'fixed_date', 'tomorrow', 'next_week', 'after_job', 'after_paid', 'annual', 'days_after_install'
);

alter table public.profiles add column if not exists business_type business_type default 'trades';
alter table public.profiles add column if not exists work_location work_location_type default 'visit_customers';
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

-- Existing users skip onboarding
update public.profiles set onboarding_completed = true where onboarding_completed = false;

alter table public.customers add column if not exists rating integer check (rating >= 1 and rating <= 5);
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists last_contacted_at timestamptz;
alter table public.customers add column if not exists lead_id uuid;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  requested_service text,
  notes text,
  status lead_status not null default 'new',
  converted_customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_user_status_idx on public.leads (user_id, status);

create table public.job_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer,
  materials text,
  suggested_price numeric(10, 2),
  created_at timestamptz not null default now()
);

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  amount numeric(10, 2) not null,
  sort_order integer not null default 0
);

create index quote_line_items_quote_idx on public.quote_line_items (quote_id);

create table public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  type communication_type not null,
  notes text,
  logged_at timestamptz not null default now()
);

create index communication_logs_customer_idx on public.communication_logs (customer_id, logged_at desc);

alter table public.leads enable row level security;
alter table public.job_templates enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.communication_logs enable row level security;

create policy "Users manage own leads" on public.leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own job_templates" on public.job_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own quote_line_items" on public.quote_line_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own communication_logs" on public.communication_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

-- Default job templates for new trades users (optional seed via app)
