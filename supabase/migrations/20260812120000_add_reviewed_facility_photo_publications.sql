-- Public projection of photos explicitly approved by the state role.
-- The source files remain in private storage and the canonical ELEPEM registry
-- is not modified. Only the exact attachment ids captured here may be served.

create table if not exists public.facility_change_publications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.intake_reports(id) on delete restrict,
  facility_id bigint not null references elepem_core.facilities(id) on delete restrict,
  remove_current_photo boolean not null default false,
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  published_at timestamptz not null default now()
);

create index if not exists facility_change_publications_facility_published_idx
  on public.facility_change_publications (facility_id, published_at desc);

create table if not exists public.facility_change_publication_photos (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.facility_change_publications(id) on delete restrict,
  attachment_id uuid not null unique references public.intake_report_attachments(id) on delete restrict,
  position integer not null check (position between 0 and 9),
  unique (publication_id, position)
);

alter table public.facility_change_publications enable row level security;
alter table public.facility_change_publications force row level security;
alter table public.facility_change_publication_photos enable row level security;
alter table public.facility_change_publication_photos force row level security;

revoke all on table public.facility_change_publications from public, anon, authenticated;
revoke all on table public.facility_change_publication_photos from public, anon, authenticated;
grant all on table public.facility_change_publications to service_role;
grant all on table public.facility_change_publication_photos to service_role;

-- Honor previous state approvals that included rights-confirmed facility photos.
-- This records the existing human decision; it does not create a new approval.
with approved_reports as (
  select distinct on (report.id)
    report.id as report_id,
    report.facility_id,
    coalesce((report.report_payload->>'removeCurrentPhoto')::boolean, false) as remove_current_photo,
    coalesce(nullif(event.event_data->>'reviewer', ''), 'state') as reviewer,
    event.created_at as published_at
  from public.intake_reports as report
  join public.intake_report_events as event
    on event.report_id = report.id
   and event.event_data->>'decision' = 'approve_preview'
  where report.is_demo = true
    and report.entry_type = 'facility_change'
    and report.facility_id is not null
    and exists (
      select 1
      from public.intake_report_attachments as attachment
      where attachment.report_id = report.id
        and attachment.purpose = 'facility_photo'
        and attachment.mime_type like 'image/%'
        and attachment.rights_metadata->>'rightsConfirmed' = 'true'
    )
  order by report.id, event.created_at desc
), inserted_publications as (
  insert into public.facility_change_publications (
    report_id, facility_id, remove_current_photo, reviewer, published_at
  )
  select report_id, facility_id, remove_current_photo, reviewer, published_at
  from approved_reports
  on conflict (report_id) do nothing
  returning id, report_id
)
insert into public.facility_change_publication_photos (
  publication_id, attachment_id, position
)
select
  publication.id,
  attachment.id,
  (row_number() over (partition by publication.id order by attachment.created_at, attachment.id) - 1)::integer
from inserted_publications as publication
join public.intake_report_attachments as attachment
  on attachment.report_id = publication.report_id
where attachment.purpose = 'facility_photo'
  and attachment.mime_type like 'image/%'
  and attachment.rights_metadata->>'rightsConfirmed' = 'true';

comment on table public.facility_change_publications is
  'Append-only audit projection of facility photos explicitly approved for public display by the state role.';
comment on table public.facility_change_publication_photos is
  'Exact private attachment ids authorized for public delivery by a facility change publication.';
