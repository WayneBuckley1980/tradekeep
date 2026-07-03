-- TradeKeep initial schema

create type subscription_tier as enum ('free', 'pro');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_tier subscription_tier not null default 'free',
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  notes text,
  last_appointment date,
  amount_paid numeric(10, 2),
  follow_up_at date,
  notification_ids jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_user_id_idx on public.customers (user_id);
create index customers_follow_up_at_idx on public.customers (follow_up_at);
create index customers_name_idx on public.customers (name);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can view own customers"
  on public.customers for select
  using (auth.uid() = user_id);

create policy "Users can insert own customers"
  on public.customers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customers"
  on public.customers for update
  using (auth.uid() = user_id);

create policy "Users can delete own customers"
  on public.customers for delete
  using (auth.uid() = user_id);

create or replace function public.enforce_customer_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tier subscription_tier;
  customer_count integer;
begin
  select subscription_tier into tier
  from public.profiles
  where id = new.user_id;

  if tier is null then
    raise exception 'Profile not found for user';
  end if;

  if tier = 'pro' then
    return new;
  end if;

  select count(*) into customer_count
  from public.customers
  where user_id = new.user_id;

  if customer_count >= 5 then
    raise exception 'FREE_TIER_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

create trigger enforce_customer_limit_trigger
  before insert on public.customers
  for each row
  execute function public.enforce_customer_limit();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();
