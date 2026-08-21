begin;

drop index if exists public.facility_memberships_status_requested_idx;
drop index if exists public.user_facility_relationships_assigned_verifier_idx;
drop index if exists public.user_facility_relationships_status_requested_idx;

alter table public.user_facility_relationships
  drop constraint user_facility_relationships_validity_check,
  drop constraint user_facility_relationships_review_check,
  drop constraint user_facility_relationships_status_check,
  drop column assigned_verifier_id,
  drop column reviewed_at,
  drop column requested_at;

update public.user_facility_relationships
set status = 'active'
where status = 'verified';
delete from public.user_facility_relationships where status in ('pending', 'expired', 'rejected');

alter table public.user_facility_relationships
  alter column status set default 'active',
  alter column verified_at set default now(),
  alter column verified_at set not null,
  add constraint user_facility_relationships_status_check check (
    status in ('active', 'suspended', 'disputed', 'revoked')
  ),
  add constraint user_facility_relationships_check check (
    valid_until is null or valid_until > verified_at
  );

drop policy if exists "Institutional users can read their own ELEPEM memberships"
  on public.facility_memberships;
create policy "Representatives can read their active ELEPEM memberships"
on public.facility_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  and status = 'active'
  and (valid_until is null or valid_until > now())
);

delete from public.facility_memberships where status in ('pending', 'rejected');
alter table public.facility_memberships
  drop constraint facility_memberships_validity_check,
  drop constraint facility_memberships_review_check,
  drop constraint facility_memberships_status_check,
  drop column reviewed_at,
  drop column requested_at,
  alter column status set default 'active',
  alter column verified_at set default now(),
  alter column verified_at set not null,
  alter column verified_by set not null,
  add constraint facility_memberships_status_check check (
    status in ('active', 'suspended', 'revoked')
  ),
  add constraint facility_memberships_validity_check check (
    valid_until is null or valid_until > verified_at
  );

alter table public.institutional_accounts
  drop constraint institutional_accounts_role_check;
update public.institutional_accounts set role = 'organization' where role = 'administrator';
delete from public.institutional_accounts where role in ('verifier', 'moderator', 'support');
alter table public.institutional_accounts
  add constraint institutional_accounts_role_check check (
    role in ('organization', 'facility_representative')
  );

commit;
