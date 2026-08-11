-- Conservative rollback for 20260811120000_add_moderated_public_experiences.
-- Raw intake reports and every pre-existing intake column remain untouched.

begin;

drop view if exists public.facility_experiences_published;

drop trigger if exists facility_experience_publications_touch_updated_at
  on elepem_core.facility_experience_publications;
drop trigger if exists facility_experience_publications_validate_report
  on elepem_core.facility_experience_publications;

drop table if exists elepem_core.facility_experience_publications;
drop function if exists elepem_core.validate_facility_experience_publication();

revoke select (id, facility_key) on table elepem_core.facilities from service_role;
revoke select (id, is_demo, entry_type, facility_id)
  on table public.intake_reports from service_role;

drop index if exists public.intake_reports_experience_facility_created_idx;
alter table public.intake_reports
  drop constraint if exists intake_reports_experience_facility_v3_check,
  drop constraint if exists intake_reports_facility_id_fkey,
  drop column if exists facility_id;

commit;
