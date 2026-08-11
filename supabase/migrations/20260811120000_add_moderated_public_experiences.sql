-- Moderated public projection for experiences linked to canonical ELEPEM rows.
-- Raw submissions remain private in intake_reports. Nothing in this migration
-- creates a publication automatically.

alter table public.intake_reports
  add column if not exists facility_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intake_reports'::regclass
      and conname = 'intake_reports_facility_id_fkey'
  ) then
    alter table public.intake_reports
      add constraint intake_reports_facility_id_fkey
      foreign key (facility_id)
      references elepem_core.facilities (id)
      on update cascade on delete restrict;
  end if;
end;
$$;

-- Prefer the canonical key used by the current registry. Fall back to the
-- preserved legacy residencial mapping for payloads submitted before the
-- unified registry became the public runtime.
with experience_facilities as (
  select
    report.id as report_id,
    coalesce(
      (
        select facility.id
        from elepem_core.facilities as facility
        where facility.facility_key = btrim(report.report_payload ->> 'facilityId')
        limit 1
      ),
      (
        select mapping.facility_id
        from elepem_core.legacy_facility_map as mapping
        where mapping.legacy_residencial_id = btrim(report.report_payload ->> 'facilityId')
          and mapping.mapping_status = 'mapped'
        limit 1
      )
    ) as facility_id
  from public.intake_reports as report
  where report.entry_type = 'experience'
    and report.facility_id is null
    and nullif(btrim(report.report_payload ->> 'facilityId'), '') is not null
)
update public.intake_reports as report
set facility_id = resolved.facility_id
from experience_facilities as resolved
where report.id = resolved.report_id
  and resolved.facility_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intake_reports'::regclass
      and conname = 'intake_reports_experience_facility_v3_check'
  ) then
    alter table public.intake_reports
      add constraint intake_reports_experience_facility_v3_check
      check (
        entry_type <> 'experience'
        or payload_version < 3
        or facility_id is not null
      );
  end if;
end;
$$;

create index if not exists intake_reports_experience_facility_created_idx
  on public.intake_reports (facility_id, created_at desc)
  where entry_type = 'experience' and facility_id is not null;

create table if not exists elepem_core.facility_experience_publications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique
    references public.intake_reports (id)
    on update cascade on delete restrict,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'withdrawn')),
  public_body text not null
    check (char_length(btrim(public_body)) between 10 and 4000),
  public_relationship text
    check (
      public_relationship is null
      or char_length(btrim(public_relationship)) between 1 and 160
    ),
  public_period text
    check (
      public_period is null
      or char_length(btrim(public_period)) between 1 and 160
    ),
  reviewer_identifier text not null
    check (char_length(btrim(reviewer_identifier)) between 1 and 200),
  previewed_at timestamptz not null default now(),
  published_at timestamptz,
  withdrawn_at timestamptz,
  withdrawal_reason text
    check (
      withdrawal_reason is null
      or char_length(btrim(withdrawal_reason)) between 1 and 1000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facility_experience_publications_state_check check (
    (
      status = 'draft'
      and published_at is null
      and withdrawn_at is null
      and withdrawal_reason is null
    )
    or (
      status = 'published'
      and published_at is not null
      and withdrawn_at is null
      and withdrawal_reason is null
    )
    or (
      status = 'withdrawn'
      and published_at is not null
      and withdrawn_at is not null
      and withdrawal_reason is not null
    )
  ),
  constraint facility_experience_publications_timeline_check check (
    (published_at is null or published_at >= previewed_at)
    and (withdrawn_at is null or withdrawn_at >= published_at)
    and updated_at >= created_at
  )
);

create index if not exists facility_experience_publications_public_feed_idx
  on elepem_core.facility_experience_publications (
    facility_id,
    published_at desc,
    id
  )
  where status = 'published';

create or replace function elepem_core.validate_facility_experience_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  linked_entry_type text;
  linked_facility_id bigint;
begin
  select report.entry_type, report.facility_id
  into linked_entry_type, linked_facility_id
  from public.intake_reports as report
  where report.id = new.report_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'publication requires an existing intake report';
  end if;

  if linked_entry_type <> 'experience' then
    raise exception using
      errcode = '23514',
      message = 'only experience intake reports can have public projections';
  end if;

  if linked_facility_id is null or linked_facility_id <> new.facility_id then
    raise exception using
      errcode = '23514',
      message = 'publication facility must match the intake report facility';
  end if;

  return new;
end;
$$;

revoke all on function elepem_core.validate_facility_experience_publication()
  from public, anon, authenticated, service_role;

drop trigger if exists facility_experience_publications_validate_report
  on elepem_core.facility_experience_publications;
create trigger facility_experience_publications_validate_report
before insert or update of report_id, facility_id
on elepem_core.facility_experience_publications
for each row execute function elepem_core.validate_facility_experience_publication();

drop trigger if exists facility_experience_publications_touch_updated_at
  on elepem_core.facility_experience_publications;
create trigger facility_experience_publications_touch_updated_at
before update on elepem_core.facility_experience_publications
for each row execute function elepem_core.touch_updated_at();

alter table elepem_core.facility_experience_publications enable row level security;
alter table elepem_core.facility_experience_publications force row level security;

revoke all on table elepem_core.facility_experience_publications
  from public, anon, authenticated, service_role;
grant usage on schema elepem_core to service_role;
grant select, insert, update on table elepem_core.facility_experience_publications
  to service_role;
-- The security-invoker view below needs only these non-sensitive join columns;
-- it does not grant service_role access to the rest of the canonical facility
-- or raw intake payload.
grant select (id, facility_key) on table elepem_core.facilities to service_role;
grant select (id, is_demo, entry_type, facility_id)
  on table public.intake_reports to service_role;

drop view if exists public.facility_experiences_published;
create view public.facility_experiences_published
with (security_invoker = true, security_barrier = true)
as
select
  publication.id as publication_id,
  facility.facility_key,
  publication.public_body,
  publication.public_relationship,
  publication.public_period,
  publication.published_at,
  report.is_demo
from elepem_core.facility_experience_publications as publication
join elepem_core.facilities as facility
  on facility.id = publication.facility_id
join public.intake_reports as report
  on report.id = publication.report_id
where publication.status = 'published';

revoke all on table public.facility_experiences_published
  from public, anon, authenticated, service_role;
grant select on table public.facility_experiences_published to service_role;

comment on column public.intake_reports.facility_id is
  'Canonical ELEPEM link. Required for experience payloads from contract version 3 onward.';
comment on table elepem_core.facility_experience_publications is
  'State-moderated public projections. Raw intake content and contacts remain private.';
comment on view public.facility_experiences_published is
  'Safe server-side read projection containing only explicitly published experience fields.';
