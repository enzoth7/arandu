begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  account_type text not null default 'personal' check (account_type in ('personal', 'elepem')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Private user profile details (name, phone, account type) for registered personal and institutional accounts.';

create index if not exists user_profiles_account_type_idx
  on public.user_profiles (account_type);

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;

revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
