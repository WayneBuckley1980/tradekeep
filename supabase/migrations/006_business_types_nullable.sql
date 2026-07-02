-- Add dog walker / dog trainer business types; allow unset business_type for home gate

alter type business_type add value if not exists 'dog_walker';
alter type business_type add value if not exists 'dog_trainer';

alter table public.profiles alter column business_type drop default;
alter table public.profiles alter column business_type drop not null;
