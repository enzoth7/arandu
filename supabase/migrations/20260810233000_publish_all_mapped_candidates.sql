-- Arandu: operator-authorized publication of every currently geolocated
-- discovery candidate. Evidence remains private/auditable but is not a
-- visibility gate. Candidates without coordinates remain held.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table arandu_mapped_publication_baseline
on commit drop
as
select
  (select count(*) from public.residenciales) as legacy_total,
  (select count(*) from public.residenciales where msp_final) as legacy_msp,
  (select count(*) from public.residenciales where mides_social) as legacy_mides,
  (select count(*) from elepem_core.facilities where registry_msp_final) as core_msp,
  (select count(*) from elepem_core.facilities where registry_mides_social) as core_mides;

-- Preserve every prior visibility decision before changing it. This audit row
-- is also the authorization marker used by production verification.
insert into elepem_core.audit_log (
  entity_type,
  entity_key,
  action,
  actor_identifier,
  before_state,
  after_state,
  request_id
)
select
  'facility',
  facility.facility_key,
  'authorize_mapped_candidate_publication',
  'operator-explicit-instruction-2026-08-10',
  jsonb_build_object(
    'identity_status', facility.identity_status,
    'registry_visibility', facility.registry_visibility,
    'location_status', facility.location_status
  ),
  jsonb_build_object(
    'identity_status', 'confirmed_facility',
    'registry_visibility', 'public',
    'location_status', 'mapped',
    'public_label', 'Situacion no confirmada'
  ),
  '20260810233000'
from elepem_core.facilities as facility
where facility.origin_candidate_id is not null
  and facility.lifecycle_status = 'current'
  and facility.location_status = 'mapped'
  and (
    facility.identity_status <> 'confirmed_facility'
    or facility.registry_visibility <> 'public'
  )
  and not exists (
    select 1
    from elepem_core.audit_log as audit
    where audit.entity_type = 'facility'
      and audit.entity_key = facility.facility_key
      and audit.action = 'authorize_mapped_candidate_publication'
      and audit.request_id = '20260810233000'
  );

-- A coordinate can exist without a street address. Keep that explicit instead
-- of dropping the point or inventing an address.
insert into elepem_core.facility_addresses (
  facility_id,
  address_line,
  normalized_address,
  locality,
  department,
  address_type,
  is_current,
  observation_id
)
select
  facility.id,
  'Direccion no informada',
  'direccion no informada',
  coalesce(nullif(trim(candidate.normalized_locality), ''), 'Sin localidad'),
  coalesce(nullif(trim(candidate.normalized_department), ''), 'Sin departamento'),
  'physical',
  true,
  primary_observation.observation_id
from elepem_core.facilities as facility
join discovery_private.facility_candidates as candidate
  on candidate.id = facility.origin_candidate_id
left join lateral (
  select candidate_source.observation_id
  from discovery_private.facility_candidate_sources as candidate_source
  where candidate_source.candidate_id = candidate.id
  order by candidate_source.linked_at, candidate_source.observation_id
  limit 1
) as primary_observation on true
where facility.lifecycle_status = 'current'
  and facility.location_status = 'mapped'
  and candidate.lat is not null
  and candidate.lng is not null
  and not exists (
    select 1
    from elepem_core.facility_addresses as address
    where address.facility_id = facility.id
      and address.is_current
      and address.address_type = 'physical'
  )
on conflict on constraint facility_addresses_value_unique do nothing;

-- Materialize the coordinates already preserved on the candidate for rows that
-- could not previously receive a geocode because address_id is mandatory.
insert into elepem_core.facility_geocodes (
  facility_id,
  address_id,
  provider,
  query_original,
  query_normalized,
  lat,
  lng,
  precision,
  precision_label,
  checked_at,
  is_current,
  observation_id
)
select
  facility.id,
  address.id,
  'legacy',
  'ARANDU_MAPPED_CANDIDATE_WITHOUT_ADDRESS',
  'direccion no informada',
  candidate.lat,
  candidate.lng,
  'referencial',
  'Coordenada disponible; direccion no informada',
  coalesce(candidate.last_seen_at, facility.updated_at, now()),
  true,
  primary_observation.observation_id
from elepem_core.facilities as facility
join discovery_private.facility_candidates as candidate
  on candidate.id = facility.origin_candidate_id
join lateral (
  select address.id
  from elepem_core.facility_addresses as address
  where address.facility_id = facility.id
    and address.is_current
    and address.address_type = 'physical'
  order by address.id desc
  limit 1
) as address on true
left join lateral (
  select candidate_source.observation_id
  from discovery_private.facility_candidate_sources as candidate_source
  where candidate_source.candidate_id = candidate.id
  order by candidate_source.linked_at, candidate_source.observation_id
  limit 1
) as primary_observation on true
where facility.lifecycle_status = 'current'
  and facility.location_status = 'mapped'
  and candidate.lat is not null
  and candidate.lng is not null
  and not exists (
    select 1
    from elepem_core.facility_geocodes as geocode
    where geocode.facility_id = facility.id
      and geocode.is_current
  )
on conflict on constraint facility_geocodes_value_unique do nothing;

update elepem_core.facilities as facility
set
  identity_status = 'confirmed_facility',
  registry_visibility = 'public'
where facility.origin_candidate_id is not null
  and facility.lifecycle_status = 'current'
  and facility.location_status = 'mapped'
  and (
    facility.identity_status <> 'confirmed_facility'
    or facility.registry_visibility <> 'public'
  );

insert into elepem_core.audit_log (
  entity_type,
  entity_key,
  action,
  actor_identifier,
  after_state,
  request_id
)
select
  'registry_migration',
  'all-geolocated-candidates-2026-08-10',
  'publish_operator_authorized_mapped_candidates',
  'operator-explicit-instruction-2026-08-10',
  jsonb_build_object(
    'automatic_publication', false,
    'authorization_scope', 'all current candidates with stored coordinates',
    'public_label', 'Situacion no confirmada',
    'candidates_without_coordinates_remain_held', true,
    'evidence_deleted', false,
    'official_msp_changed', false,
    'official_mides_changed', false
  ),
  '20260810233000'
where not exists (
  select 1
  from elepem_core.audit_log
  where entity_type = 'registry_migration'
    and entity_key = 'all-geolocated-candidates-2026-08-10'
    and request_id = '20260810233000'
  );

do $$
declare
  baseline record;
begin
  select * into baseline from arandu_mapped_publication_baseline;

  if (select count(*) from public.residenciales) <> baseline.legacy_total
    or (select count(*) from public.residenciales where msp_final) <> baseline.legacy_msp
    or (select count(*) from public.residenciales where mides_social) <> baseline.legacy_mides then
    raise exception 'Legacy registry changed during mapped candidate publication';
  end if;

  if (select count(*) from elepem_core.facilities where registry_msp_final) <> baseline.core_msp
    or (select count(*) from elepem_core.facilities where registry_mides_social) <> baseline.core_mides then
    raise exception 'Frozen MSP/MIDES facts changed during mapped candidate publication';
  end if;

  if exists (
    select 1
    from elepem_core.facilities as facility
    where facility.origin_candidate_id is not null
      and facility.lifecycle_status = 'current'
      and facility.location_status = 'mapped'
      and (
        facility.identity_status <> 'confirmed_facility'
        or facility.registry_visibility <> 'public'
        or not exists (
          select 1 from elepem_core.facility_addresses as address
          where address.facility_id = facility.id and address.is_current and address.address_type = 'physical'
        )
        or not exists (
          select 1 from elepem_core.facility_geocodes as geocode
          where geocode.facility_id = facility.id and geocode.is_current
        )
      )
  ) then
    raise exception 'At least one current mapped candidate remains outside the registry view contract';
  end if;
end;
$$;

comment on view public.arandu_facilities_registry is
  'Single mapped registry. MSP/MIDES are frozen facts; operator-authorized geolocated candidates are shown as situacion no confirmada regardless of internal evidence tier.';

commit;
