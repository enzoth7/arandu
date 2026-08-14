-- MANUAL PHASE TWO - NEVER RUN THROUGH THE AUTOMATIC MIGRATION CHAIN.
--
-- Required session settings:
--   set arandu.elepem_cleanup_authorized = 'DROP-LEGACY-ELEPEM-20260813';
--   set arandu.elepem_backup_manifest_sha256 = '<64 lowercase hex characters>';
--   set arandu.elepem_restore_point = '<verified managed snapshot/PITR identifier>';
--
-- The local trace archive is not a complete disaster-recovery backup because
-- prohibited/raw fields are redacted. Phase two also requires a managed
-- database restore point that has been rehearsed in a disposable database.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

select pg_advisory_xact_lock(hashtextextended('arandu:elepem-flat-cutover', 0));

do $$
declare
  cleanup_token text := current_setting('arandu.elepem_cleanup_authorized', true);
  manifest_sha text := current_setting('arandu.elepem_backup_manifest_sha256', true);
  restore_point text := current_setting('arandu.elepem_restore_point', true);
begin
  if cleanup_token is distinct from 'DROP-LEGACY-ELEPEM-20260813' then
    raise exception 'Legacy cleanup requires the exact explicit authorization token';
  end if;
  if manifest_sha is null or manifest_sha !~ '^[a-f0-9]{64}$' then
    raise exception 'Legacy cleanup requires a verified backup manifest SHA-256';
  end if;
  if restore_point is null or char_length(btrim(restore_point)) not between 8 and 200 then
    raise exception 'Legacy cleanup requires a verified managed snapshot/PITR restore point';
  end if;
  if (select count(*) from public.elepem) <> 1019
    or (select count(*) from public.elepem_sin_ubicacion) <> 83
    or (select count(*) from public.elepem where msp_habilitado) <> 212
    or (select count(*) from public.elepem where mides_certificado) <> 275
    or (select count(*) from public.elepem where not msp_habilitado and not mides_certificado) <> 702 then
    raise exception 'Flat registry verification failed; legacy objects will not be removed';
  end if;
  if exists (
    select 1 from public.intake_reports as report
    where report.facility_id is not null
      and not exists (select 1 from public.elepem where id = report.facility_id)
  ) or exists (
    select 1 from elepem_core.facility_experience_publications as publication
    where publication.facility_id is not null
      and not exists (select 1 from public.elepem where id = publication.facility_id)
  ) or exists (
    select 1 from public.facility_document_status_reviews as review
    where review.facility_id is not null
      and not exists (select 1 from public.elepem where id = review.facility_id)
  ) or exists (
    select 1 from public.facility_change_publications as publication
    where publication.facility_id is not null
      and not exists (select 1 from public.elepem where id = publication.facility_id)
  ) then
    raise exception 'A retained backend relation still has an orphan reference';
  end if;
end;
$$;

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier, after_state, request_id
)
values (
  'registry_migration',
  'legacy-elepem-cleanup:2026-08-13',
  'drop_reconciled_legacy_registry_objects',
  'operator-explicit-maintenance-session',
  jsonb_build_object(
    'backup_manifest_sha256', current_setting('arandu.elepem_backup_manifest_sha256'),
    'managed_restore_point', current_setting('arandu.elepem_restore_point'),
    'mapped_rows_preserved', 1019,
    'isolated_rows_preserved', 83,
    'automatic_publication', false
  ),
  '20260813130000'
);

drop view if exists public.arandu_facilities_identity_queue;
drop view if exists public.arandu_facilities_registry;
drop view if exists public.arandu_facility_source_links;
drop view if exists public.known_facilities_exclusion_view;
drop view if exists public.residenciales_legacy_compat;
drop view if exists public.facilities_public_approved;
drop view if exists public.facilities_current_internal;

drop table public.elepem_sin_coordenadas_no_confirmadas;
drop table public.residencial_discovery_candidates;

-- Remove normalized children before their discovery evidence. This keeps the
-- cleanup explicit and avoids CASCADE hiding an unexpected retained object.
drop table elepem_core.facility_public_profiles;
drop table elepem_core.facility_capacity_observations;
drop table elepem_core.facility_reviews;
drop table elepem_core.facility_social_accounts;
drop table elepem_core.facility_contacts;
drop table elepem_core.facility_operators;
drop table elepem_core.facility_administrative_events;
drop table elepem_core.facility_geocodes;
drop table elepem_core.facility_addresses;
drop table elepem_core.facility_names;
drop table elepem_core.facility_observation_links;
drop table elepem_core.legacy_facility_map;

alter table elepem_core.facilities
  drop constraint facilities_origin_candidate_id_fkey;

drop table discovery_private.facility_candidate_match_suggestions;
drop table discovery_private.facility_candidate_review_events;
drop table discovery_private.facility_external_ids;
drop table discovery_private.facility_candidate_sources;
drop table discovery_private.facility_candidates;
drop table discovery_private.facility_source_observations;
drop table discovery_private.facility_source_runs;
drop function discovery_private.enforce_candidate_public_eligibility();
drop function discovery_private.reject_facility_candidate_review_event_mutation();
drop schema discovery_private;

drop table elepem_core.organizations;
drop table elepem_core.source_catalog;
drop table elepem_core.facilities;

drop table public.residenciales;

drop function if exists elepem_core.guard_registry_official_snapshot();
drop function if exists elepem_core.enforce_facility_publication();

do $$
begin
  if to_regclass('public.elepem') is null
    or to_regclass('public.elepem_sin_ubicacion') is null
    or to_regclass('elepem_core.audit_log') is null
    or to_regclass('elepem_core.facility_experience_publications') is null
    or to_regclass('public.intake_reports') is null
    or to_regclass('public.facility_change_publications') is null then
    raise exception 'A retained table was removed unexpectedly';
  end if;
  if to_regclass('public.residenciales') is not null
    or to_regclass('elepem_core.facilities') is not null
    or to_regclass('public.elepem_sin_coordenadas_no_confirmadas') is not null
    or exists (select 1 from pg_namespace where nspname = 'discovery_private') then
    raise exception 'At least one legacy ELEPEM object remains';
  end if;
end;
$$;

commit;
