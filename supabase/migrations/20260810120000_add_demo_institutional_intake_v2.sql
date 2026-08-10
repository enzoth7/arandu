-- Additive demo envelope for concerns, experiences and ELEPEM change requests.
-- This migration never reads from or writes to public.residenciales or elepem_core.

alter table public.intake_reports
  add column if not exists entry_type text not null default 'concern',
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_facility_id text,
  add column if not exists payload_version integer not null default 1,
  add column if not exists submitted_actor text not null default 'public';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_entry_type_check') then
    alter table public.intake_reports add constraint intake_reports_entry_type_check
      check (entry_type in ('concern', 'experience', 'facility_change'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_demo_facility_check') then
    alter table public.intake_reports add constraint intake_reports_demo_facility_check
      check (demo_facility_id is null or demo_facility_id ~ '^DEMO-ELEPEM-00[1-3]$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_payload_version_check') then
    alter table public.intake_reports add constraint intake_reports_payload_version_check
      check (payload_version between 1 and 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_submitted_actor_check') then
    alter table public.intake_reports add constraint intake_reports_submitted_actor_check
      check (submitted_actor in ('public', 'system', 'state', 'facility'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_demo_envelope_check') then
    alter table public.intake_reports add constraint intake_reports_demo_envelope_check
      check (
        (not is_demo and demo_facility_id is null)
        or (is_demo and payload_version >= 2)
      );
  end if;
end;
$$;

create index if not exists intake_reports_demo_inbox_idx
  on public.intake_reports (entry_type, created_at desc)
  where is_demo = true;

alter table public.intake_report_attachments
  add column if not exists purpose text not null default 'evidence',
  add column if not exists rights_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_purpose_check') then
    alter table public.intake_report_attachments add constraint intake_report_attachments_purpose_check
      check (purpose in ('evidence', 'audio', 'facility_photo', 'supporting_document'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_rights_check') then
    alter table public.intake_report_attachments add constraint intake_report_attachments_rights_check
      check (jsonb_typeof(rights_metadata) = 'object' and octet_length(rights_metadata::text) <= 8192);
  end if;
end;
$$;

create table if not exists public.intake_report_contacts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.intake_reports(id) on delete cascade,
  name text check (name is null or char_length(name) between 1 and 160),
  phone text check (phone is null or char_length(phone) between 6 and 24),
  email text check (email is null or char_length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  check (name is not null or phone is not null or email is not null)
);

create unique index if not exists intake_report_contacts_report_idx
  on public.intake_report_contacts (report_id);

alter table public.intake_report_contacts enable row level security;
alter table public.intake_report_contacts force row level security;
revoke all on table public.intake_report_contacts from public, anon, authenticated;
grant all on table public.intake_report_contacts to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'intake_report_contacts'
      and policyname = 'No direct access to intake contacts'
  ) then
    create policy "No direct access to intake contacts"
      on public.intake_report_contacts for all to anon, authenticated
      using (false) with check (false);
  end if;
end;
$$;

alter table public.intake_report_events
  drop constraint if exists intake_report_events_actor_check;
alter table public.intake_report_events
  add constraint intake_report_events_actor_check
  check (actor in ('system', 'state', 'facility', 'organization'));

create or replace function app_private.keep_intake_events_append_only()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE'
    and current_setting('app.demo_reset', true) = 'on'
  then
    return old;
  end if;
  raise exception 'intake_report_events is append-only';
end;
$$;

revoke execute on function app_private.keep_intake_events_append_only() from public, anon, authenticated;
drop trigger if exists intake_report_events_append_only on public.intake_report_events;
create trigger intake_report_events_append_only
before update or delete on public.intake_report_events
for each row execute function app_private.keep_intake_events_append_only();
