begin;

create table public.facility_visits (
  id uuid primary key default gen_random_uuid(),
  facility_id bigint not null references public.elepem(id) on update cascade on delete restrict,
  requester_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'solicitada',
  preferred_start_at timestamptz not null,
  proposed_start_at timestamptz,
  confirmed_start_at timestamptz,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  party_size smallint not null,
  practical_note text,
  facility_note text,
  acknowledged_not_confirmation boolean not null,
  experience_report_id uuid unique references public.intake_reports(id) on update cascade on delete restrict,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facility_visits_status_check check (status = any (array[
    'solicitada'::text,
    'horario_propuesto'::text,
    'confirmada'::text,
    'cancelada_usuario'::text,
    'cancelada_elepem'::text,
    'realizada'::text,
    'no_realizada'::text
  ])),
  constraint facility_visits_contact_name_check check (
    char_length(btrim(contact_name)) between 1 and 120
  ),
  constraint facility_visits_contact_channel_check check (
    num_nonnulls(contact_email, contact_phone) >= 1
  ),
  constraint facility_visits_contact_email_check check (
    contact_email is null or (
      char_length(btrim(contact_email)) between 3 and 254
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    )
  ),
  constraint facility_visits_contact_phone_check check (
    contact_phone is null or char_length(btrim(contact_phone)) between 6 and 32
  ),
  constraint facility_visits_party_size_check check (party_size between 1 and 6),
  constraint facility_visits_practical_note_check check (
    practical_note is null or char_length(btrim(practical_note)) between 1 and 500
  ),
  constraint facility_visits_facility_note_check check (
    facility_note is null or char_length(btrim(facility_note)) between 1 and 500
  ),
  constraint facility_visits_acknowledgement_check check (acknowledged_not_confirmation),
  constraint facility_visits_schedule_check check (
    (status <> 'horario_propuesto' or proposed_start_at is not null)
    and (status <> all (array['confirmada'::text, 'realizada'::text, 'no_realizada'::text]) or confirmed_start_at is not null)
  ),
  constraint facility_visits_experience_check check (
    experience_report_id is null or status = 'realizada'
  ),
  constraint facility_visits_timeline_check check (
    status_changed_at >= created_at and updated_at >= created_at
  )
);

comment on table public.facility_visits is
  'Private visit requests. A request is not a reservation or admission confirmation.';
comment on column public.facility_visits.practical_note is
  'Private logistical note only; diagnoses and personal resident data are prohibited.';
comment on column public.facility_visits.experience_report_id is
  'At most one moderated visit-experience intake report for a completed visit.';

create index facility_visits_requester_created_idx
  on public.facility_visits (requester_user_id, created_at desc);
create index facility_visits_facility_status_created_idx
  on public.facility_visits (facility_id, status, created_at desc);

alter table public.facility_visits enable row level security;
alter table public.facility_visits force row level security;

create policy "Visitors can read their own visits"
  on public.facility_visits
  for select
  to authenticated
  using (requester_user_id = (select auth.uid()));

create policy "Representatives can read visits for active memberships"
  on public.facility_visits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.facility_memberships membership
      join public.institutional_accounts account
        on account.user_id = membership.user_id
      where membership.user_id = (select auth.uid())
        and membership.elepem_id = facility_visits.facility_id
        and membership.status = 'active'
        and account.status = 'active'
        and account.role = 'facility_representative'
        and (membership.valid_until is null or membership.valid_until > now())
    )
  );

revoke all on table public.facility_visits from anon, authenticated;
grant select on table public.facility_visits to authenticated;
grant all on table public.facility_visits to service_role;

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
  case
    when report.report_payload->>'experienceKind' = 'visit' then 'visit'
    else 'residential'
  end as experience_kind
from elepem_core.facility_experience_publications publication
left join public.elepem facility on facility.id = publication.facility_id
left join arandu_demo.facilities demo on demo.id = publication.demo_facility_id
join public.intake_reports report on report.id = publication.report_id
where publication.status = 'published';

grant select on public.facility_experiences_published to anon, authenticated, service_role;

commit;
