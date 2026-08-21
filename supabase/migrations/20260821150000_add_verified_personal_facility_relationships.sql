create table public.user_facility_relationships (
  user_id uuid not null references auth.users(id) on delete cascade,
  elepem_id bigint not null references public.elepem(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('resident', 'family')),
  status text not null default 'active' check (status in ('active', 'suspended', 'disputed', 'revoked')),
  verified_at timestamptz not null default now(),
  verified_by uuid references public.institutional_accounts(user_id),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, elepem_id),
  check (valid_until is null or valid_until > verified_at)
);

comment on table public.user_facility_relationships is
  'Private, verified resident or family relationship used only to authorize brief experiences. Never exposed to an ELEPEM or the public.';
comment on column public.user_facility_relationships.relationship_type is
  'Controls the resident/family wording. It is assigned by an authorized reviewer, never selected in the experience form.';

create index user_facility_relationships_active_user_idx
  on public.user_facility_relationships (user_id, elepem_id)
  where status = 'active';

create trigger user_facility_relationships_touch_updated_at
before update on public.user_facility_relationships
for each row execute function elepem_core.touch_updated_at();

alter table public.user_facility_relationships enable row level security;
alter table public.user_facility_relationships force row level security;

revoke all on table public.user_facility_relationships from anon, authenticated;
grant select on table public.user_facility_relationships to authenticated;
grant select, insert, update, delete on table public.user_facility_relationships to service_role;

create policy user_facility_relationships_read_own
on public.user_facility_relationships
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace view public.facility_experiences_published
with (security_invoker = true)
as
select
  publication.id as publication_id,
  coalesce(facility.codigo, demo.id) as facility_key,
  publication.public_body,
  publication.public_relationship,
  publication.public_period,
  publication.published_at,
  report.is_demo,
  case when report.report_payload->>'experienceKind' = 'visit' then 'visit' else 'residential' end as experience_kind,
  case
    when report.report_payload->>'experienceKind' = 'visit' then 'visitor'
    when report.report_payload->'relationshipSnapshot'->>'type' = 'resident' then 'resident'
    when report.report_payload->'relationshipSnapshot'->>'type' = 'family' then 'family'
    else null
  end as public_perspective
from elepem_core.facility_experience_publications publication
left join public.elepem facility on facility.id = publication.facility_id
left join arandu_demo.facilities demo on demo.id = publication.demo_facility_id
join public.intake_reports report on report.id = publication.report_id
where publication.status = 'published';

grant select on public.facility_experiences_published to anon, authenticated, service_role;
