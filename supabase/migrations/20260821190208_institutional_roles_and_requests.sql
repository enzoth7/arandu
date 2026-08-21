begin;

-- Replace the broad prototype role with attributable, individual functions.
alter table public.institutional_accounts
  drop constraint institutional_accounts_role_check;

update public.institutional_accounts
set role = 'administrator', updated_at = now()
where role = 'organization';

alter table public.institutional_accounts
  add constraint institutional_accounts_role_check check (
    role in ('administrator', 'verifier', 'moderator', 'support', 'facility_representative')
  );

-- A representative can request a membership, but only an administrator can
-- activate it. Existing active memberships keep their verification data.
alter table public.facility_memberships
  drop constraint facility_memberships_status_check,
  drop constraint facility_memberships_validity_check,
  alter column status set default 'pending',
  alter column verified_at drop not null,
  alter column verified_at drop default,
  alter column verified_by drop not null,
  add column requested_at timestamptz not null default now(),
  add column reviewed_at timestamptz;

update public.facility_memberships
set reviewed_at = coalesce(updated_at, verified_at, created_at),
    requested_at = coalesce(created_at, verified_at)
where status in ('active', 'suspended', 'revoked');

alter table public.facility_memberships
  add constraint facility_memberships_status_check check (
    status in ('pending', 'active', 'suspended', 'rejected', 'revoked')
  ),
  add constraint facility_memberships_review_check check (
    (status = 'pending' and verified_at is null and verified_by is null and reviewed_at is null)
    or
    (status = 'rejected' and verified_at is null and verified_by is null and reviewed_at is not null)
    or
    (status in ('active', 'suspended', 'revoked') and verified_at is not null and verified_by is not null and reviewed_at is not null)
  ),
  add constraint facility_memberships_validity_check check (
    valid_until is null or (verified_at is not null and valid_until > verified_at)
  );

drop policy if exists "Representatives can read their active ELEPEM memberships"
  on public.facility_memberships;
create policy "Institutional users can read their own ELEPEM memberships"
on public.facility_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

-- Relationship rows now carry the request and its eventual verified result.
-- No document, resident name or family identity is collected here.
alter table public.user_facility_relationships
  drop constraint user_facility_relationships_status_check,
  drop constraint user_facility_relationships_check,
  alter column status set default 'pending',
  alter column verified_at drop not null,
  alter column verified_at drop default,
  add column requested_at timestamptz not null default now(),
  add column reviewed_at timestamptz,
  add column assigned_verifier_id uuid references public.institutional_accounts(user_id) on delete set null;

update public.user_facility_relationships
set status = case when verified_by is not null then 'verified' else 'pending' end,
    verified_at = case when verified_by is not null then verified_at else null end,
    reviewed_at = case when verified_by is not null then coalesce(updated_at, verified_at, created_at) else null end,
    requested_at = coalesce(created_at, verified_at, now())
where status = 'active';

alter table public.user_facility_relationships
  add constraint user_facility_relationships_status_check check (
    status in ('pending', 'verified', 'expired', 'disputed', 'rejected', 'revoked')
  ),
  add constraint user_facility_relationships_review_check check (
    (status = 'pending' and verified_at is null and verified_by is null and reviewed_at is null)
    or
    (status = 'rejected' and verified_at is null and verified_by is null and reviewed_at is not null)
    or
    (status in ('verified', 'expired', 'disputed', 'revoked') and verified_at is not null and verified_by is not null and reviewed_at is not null)
  ),
  add constraint user_facility_relationships_validity_check check (
    valid_until is null or (verified_at is not null and valid_until > verified_at)
  );

create index user_facility_relationships_status_requested_idx
  on public.user_facility_relationships (status, requested_at);
create index user_facility_relationships_assigned_verifier_idx
  on public.user_facility_relationships (assigned_verifier_id)
  where assigned_verifier_id is not null;
create index facility_memberships_status_requested_idx
  on public.facility_memberships (status, requested_at);

comment on column public.user_facility_relationships.assigned_verifier_id is
  'Optional verifier that claimed the minimal relationship request. Never exposed publicly or to the ELEPEM.';
comment on column public.facility_memberships.requested_at is
  'Date when an authenticated person requested to represent the ELEPEM.';

commit;
