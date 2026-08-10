-- Local/test rollback. Remove demo rows first; canonical registry tables are untouched.
begin;
set local app.demo_reset = 'on';

delete from public.intake_reports where is_demo = true;

drop trigger if exists intake_report_events_append_only on public.intake_report_events;
drop function if exists app_private.keep_intake_events_append_only();

alter table public.intake_report_events
  drop constraint if exists intake_report_events_actor_check;
update public.intake_report_events
set actor = 'organization'
where actor in ('state', 'facility');
alter table public.intake_report_events
  add constraint intake_report_events_actor_check
  check (actor in ('system', 'organization'));

drop table if exists public.intake_report_contacts;

alter table public.intake_report_attachments
  drop constraint if exists intake_report_attachments_purpose_check,
  drop constraint if exists intake_report_attachments_rights_check,
  drop column if exists purpose,
  drop column if exists rights_metadata;

drop index if exists public.intake_reports_demo_inbox_idx;
alter table public.intake_reports
  drop constraint if exists intake_reports_entry_type_check,
  drop constraint if exists intake_reports_demo_facility_check,
  drop constraint if exists intake_reports_payload_version_check,
  drop constraint if exists intake_reports_submitted_actor_check,
  drop constraint if exists intake_reports_demo_envelope_check,
  drop column if exists entry_type,
  drop column if exists is_demo,
  drop column if exists demo_facility_id,
  drop column if exists payload_version,
  drop column if exists submitted_actor;

commit;
