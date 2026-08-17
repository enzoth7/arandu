-- Denormalized display name for operational photo auditing. The canonical
-- facility identity continues to be the existing report/publication relation.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

alter table public.intake_report_attachments
  add column if not exists facility_name text;

alter table public.facility_change_publication_photos
  add column if not exists facility_name text;

update public.intake_report_attachments as attachment
set facility_name = facility.nombre
from public.intake_reports as report
join public.elepem as facility on facility.id = report.facility_id
where attachment.report_id = report.id
  and nullif(btrim(attachment.facility_name), '') is null;

update public.facility_change_publication_photos as photo
set facility_name = facility.nombre
from public.facility_change_publications as publication
join public.elepem as facility on facility.id = publication.facility_id
where photo.publication_id = publication.id
  and nullif(btrim(photo.facility_name), '') is null;

create or replace function app_private.set_intake_attachment_facility_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(btrim(new.facility_name), '') is null then
    select nullif(btrim(facility.nombre), '')
      into new.facility_name
    from public.intake_reports as report
    join public.elepem as facility on facility.id = report.facility_id
    where report.id = new.report_id;
  end if;
  return new;
end;
$$;

create or replace function app_private.set_facility_change_photo_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(btrim(new.facility_name), '') is null then
    select coalesce(nullif(btrim(attachment.facility_name), ''), nullif(btrim(facility.nombre), ''))
      into new.facility_name
    from public.facility_change_publications as publication
    join public.elepem as facility on facility.id = publication.facility_id
    left join public.intake_report_attachments as attachment on attachment.id = new.attachment_id
    where publication.id = new.publication_id;
  end if;
  return new;
end;
$$;

revoke execute on function app_private.set_intake_attachment_facility_name() from public, anon, authenticated;
revoke execute on function app_private.set_facility_change_photo_name() from public, anon, authenticated;

drop trigger if exists intake_report_attachments_set_facility_name on public.intake_report_attachments;
create trigger intake_report_attachments_set_facility_name
before insert or update of report_id, facility_name on public.intake_report_attachments
for each row execute function app_private.set_intake_attachment_facility_name();

drop trigger if exists facility_change_publication_photos_set_facility_name on public.facility_change_publication_photos;
create trigger facility_change_publication_photos_set_facility_name
before insert or update of publication_id, attachment_id, facility_name on public.facility_change_publication_photos
for each row execute function app_private.set_facility_change_photo_name();

create index if not exists intake_report_attachments_facility_name_idx
  on public.intake_report_attachments (facility_name)
  where facility_name is not null;

create index if not exists facility_change_publication_photos_facility_name_idx
  on public.facility_change_publication_photos (facility_name)
  where facility_name is not null;

comment on column public.intake_report_attachments.facility_name is
  'ELEPEM name copied from the linked facility for private attachment identification.';
comment on column public.facility_change_publication_photos.facility_name is
  'ELEPEM name copied from the linked facility for public photo publication identification.';

commit;
