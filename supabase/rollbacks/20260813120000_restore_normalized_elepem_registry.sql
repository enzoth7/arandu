-- Revert only the additive flat-registry cutover.
-- Legacy ELEPEM tables are still present because the destructive cleanup is a
-- separate, manually gated operation.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

select pg_advisory_xact_lock(hashtextextended('arandu:elepem-flat-cutover', 0));

drop view if exists public.facility_experiences_published;
revoke select (id) on table arandu_demo.facilities from service_role;
revoke usage on schema arandu_demo from service_role;
drop trigger if exists facility_experience_publications_validate_report
  on elepem_core.facility_experience_publications;
drop trigger if exists facility_document_status_reviews_append_only
  on public.facility_document_status_reviews;

alter table public.intake_reports
  drop constraint if exists intake_reports_facility_id_fkey,
  drop constraint if exists intake_reports_demo_facility_id_fkey,
  drop constraint if exists intake_reports_experience_facility_v3_check;

alter table elepem_core.facility_experience_publications
  drop constraint if exists facility_experience_publications_facility_id_fkey,
  drop constraint if exists facility_experience_publications_demo_facility_id_fkey,
  drop constraint if exists facility_experience_publications_owner_check;

alter table public.facility_change_publications
  drop constraint if exists facility_change_publications_facility_id_fkey,
  drop constraint if exists facility_change_publications_demo_facility_id_fkey,
  drop constraint if exists facility_change_publications_owner_check;

alter table public.facility_document_status_reviews
  drop constraint if exists facility_document_status_reviews_facility_id_fkey,
  drop constraint if exists facility_document_status_reviews_demo_facility_id_fkey,
  drop constraint if exists facility_document_status_reviews_owner_check;

update public.intake_reports as report
set facility_id = facility.id,
    demo_facility_id = null,
    updated_at = now()
from elepem_core.facilities as facility
where report.demo_facility_id = facility.facility_key and facility.is_demo;

update elepem_core.facility_experience_publications as publication
set facility_id = facility.id
from elepem_core.facilities as facility
where publication.demo_facility_id = facility.facility_key and facility.is_demo;

update public.facility_change_publications as publication
set facility_id = facility.id
from elepem_core.facilities as facility
where publication.demo_facility_id = facility.facility_key and facility.is_demo;

update public.facility_document_status_reviews as review
set facility_id = facility.id
from elepem_core.facilities as facility
where review.demo_facility_id = facility.facility_key and facility.is_demo;

alter table public.intake_reports
  add constraint intake_reports_facility_id_fkey
    foreign key (facility_id) references elepem_core.facilities(id)
    on update cascade on delete restrict,
  add constraint intake_reports_experience_facility_v3_check check (
    entry_type <> 'experience' or payload_version < 3 or facility_id is not null
  );

alter table elepem_core.facility_experience_publications
  alter column facility_id set not null,
  add constraint facility_experience_publications_facility_id_fkey
    foreign key (facility_id) references elepem_core.facilities(id)
    on update cascade on delete restrict,
  drop column demo_facility_id;

alter table public.facility_change_publications
  alter column facility_id set not null,
  add constraint facility_change_publications_facility_id_fkey
    foreign key (facility_id) references elepem_core.facilities(id) on delete restrict,
  drop column demo_facility_id;

alter table public.facility_document_status_reviews
  alter column facility_id set not null,
  add constraint facility_document_status_reviews_facility_id_fkey
    foreign key (facility_id) references elepem_core.facilities(id),
  drop column demo_facility_id;

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
    raise exception using errcode = '23503', message = 'publication requires an existing intake report';
  end if;
  if linked_entry_type <> 'experience' then
    raise exception using errcode = '23514', message = 'only experience intake reports can have public projections';
  end if;
  if linked_facility_id is null or linked_facility_id <> new.facility_id then
    raise exception using errcode = '23514', message = 'publication facility must match the intake report facility';
  end if;
  return new;
end;
$$;

revoke all on function elepem_core.validate_facility_experience_publication()
  from public, anon, authenticated, service_role;

create trigger facility_experience_publications_validate_report
before insert or update of report_id, facility_id
on elepem_core.facility_experience_publications
for each row execute function elepem_core.validate_facility_experience_publication();

create trigger facility_document_status_reviews_append_only
before update or delete on public.facility_document_status_reviews
for each row execute function app_private.keep_facility_document_reviews_append_only();

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
join elepem_core.facilities as facility on facility.id = publication.facility_id
join public.intake_reports as report on report.id = publication.report_id
where publication.status = 'published';

revoke all on table public.facility_experiences_published
  from public, anon, authenticated, service_role;
grant select on table public.facility_experiences_published to service_role;

delete from arandu_demo.facilities where id = 'DEMO-ELEPEM-001';

drop table public.elepem_sin_ubicacion;
drop table public.elepem;
drop function app_private.elepem_external_urls_valid(text[]);
drop function app_private.touch_flat_elepem_updated_at();

commit;
