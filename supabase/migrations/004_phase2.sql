-- TradeKeep v2.2: properties, equipment, voice notes, client documents, richer reminders

-- Extend attachment kinds for client documents and voice notes
alter type attachment_kind add value if not exists 'insurance';
alter type attachment_kind add value if not exists 'guarantee';
alter type attachment_kind add value if not exists 'manual';
alter type attachment_kind add value if not exists 'receipt';
alter type attachment_kind add value if not exists 'document_photo';
alter type attachment_kind add value if not exists 'voice';

-- Customer reminder configuration (reminder_type enum from 003)
alter table public.customers add column if not exists reminder_type reminder_type default 'fixed_date';
alter table public.customers add column if not exists reminder_offset_days integer;

-- Properties linked to customers
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_customer_idx on public.properties (customer_id);
create index if not exists properties_user_idx on public.properties (user_id);

alter table public.jobs add column if not exists property_id uuid references public.properties (id) on delete set null;

-- Equipment register for servicing
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  name text not null,
  make_model text,
  serial_number text,
  installed_at date,
  warranty_until date,
  last_service_at date,
  next_service_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_customer_idx on public.equipment (customer_id);

create table if not exists public.equipment_service_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  serviced_at date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists equipment_service_log_equipment_idx on public.equipment_service_log (equipment_id, serviced_at desc);

-- RLS
alter table public.properties enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_service_log enable row level security;

create policy "Users manage own properties" on public.properties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own equipment" on public.equipment for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own equipment_service_log" on public.equipment_service_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger properties_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();
