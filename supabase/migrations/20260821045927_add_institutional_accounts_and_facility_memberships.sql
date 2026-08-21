-- Individual institutional accounts and verified access to existing ELEPEM.
-- Public users never write these tables directly; provisioning remains an
-- explicit server/Dashboard operation during the pilot.

create table public.institutional_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null
    check (role in ('organization', 'facility_representative')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facility_memberships (
  user_id uuid not null
    references public.institutional_accounts(user_id) on delete cascade,
  elepem_id bigint not null
    references public.elepem(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  verified_at timestamptz not null default now(),
  verified_by uuid not null
    references public.institutional_accounts(user_id) on delete restrict,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, elepem_id),
  constraint facility_memberships_distinct_verifier_check
    check (user_id <> verified_by),
  constraint facility_memberships_validity_check
    check (valid_until is null or valid_until > verified_at)
);

alter table public.intake_reports
  add column submitted_by_user_id uuid
    references auth.users(id) on delete set null;

create index facility_memberships_elepem_id_idx
  on public.facility_memberships (elepem_id);

create index facility_memberships_verified_by_idx
  on public.facility_memberships (verified_by);

create index intake_reports_submitted_by_user_id_idx
  on public.intake_reports (submitted_by_user_id)
  where submitted_by_user_id is not null;

create trigger institutional_accounts_touch_updated_at
before update on public.institutional_accounts
for each row execute function app_private.touch_flat_elepem_updated_at();

create trigger facility_memberships_touch_updated_at
before update on public.facility_memberships
for each row execute function app_private.touch_flat_elepem_updated_at();

alter table public.institutional_accounts enable row level security;
alter table public.institutional_accounts force row level security;
alter table public.facility_memberships enable row level security;
alter table public.facility_memberships force row level security;

revoke all on table public.institutional_accounts
  from public, anon, authenticated, service_role;
revoke all on table public.facility_memberships
  from public, anon, authenticated, service_role;

grant select on table public.institutional_accounts to authenticated;
grant select on table public.facility_memberships to authenticated;
grant select, insert, update, delete on table public.institutional_accounts
  to service_role;
grant select, insert, update, delete on table public.facility_memberships
  to service_role;

create policy "Institutional accounts can read their active account"
on public.institutional_accounts
for select
to authenticated
using (
  user_id = (select auth.uid())
  and status = 'active'
);

create policy "Representatives can read their active ELEPEM memberships"
on public.facility_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  and status = 'active'
  and (valid_until is null or valid_until > now())
);

-- All intake submissions enter through server-side routes. The former direct
-- Data API insert path is no longer part of the product after phase 6.
drop policy if exists "anonymous intake submissions only"
  on public.intake_reports;
revoke insert on table public.intake_reports from anon, authenticated;

comment on table public.institutional_accounts is
  'Server-managed institutional permission for an invited Supabase Auth user.';
comment on table public.facility_memberships is
  'Verified assignment of a facility representative to an existing public.elepem row.';
comment on column public.intake_reports.submitted_by_user_id is
  'Supabase Auth user that submitted an authenticated private intake item; null for historical or anonymous records.';
