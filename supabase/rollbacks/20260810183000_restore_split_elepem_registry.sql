begin;

drop view if exists public.arandu_facilities_identity_queue;
drop view if exists public.arandu_facilities_registry;
drop view if exists public.arandu_facility_source_links;

drop trigger if exists facilities_guard_registry_official_snapshot
  on elepem_core.facilities;
drop function if exists elepem_core.guard_registry_official_snapshot();

drop index if exists elepem_core.facilities_administrative_status_idx;
drop index if exists elepem_core.facilities_registry_state_idx;
drop index if exists elepem_core.facilities_origin_candidate_key;

alter table elepem_core.facilities
  drop column if exists administrative_status,
  drop column if exists origin_candidate_id,
  drop column if exists migration_payload,
  drop column if exists demo_price_includes,
  drop column if exists demo_price_as_of,
  drop column if exists demo_monthly_price_uyu,
  drop column if exists source_link_status,
  drop column if exists primary_source_url,
  drop column if exists primary_source_label,
  drop column if exists registry_mides_social,
  drop column if exists registry_msp_final,
  drop column if exists location_status,
  drop column if exists registry_visibility,
  drop column if exists identity_status;

commit;
