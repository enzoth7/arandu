-- Reverts the operator-authorized candidate visibility decision while keeping
-- append-only audit history intact.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

update elepem_core.facilities as facility
set
  identity_status = audit.before_state ->> 'identity_status',
  registry_visibility = audit.before_state ->> 'registry_visibility',
  location_status = audit.before_state ->> 'location_status'
from elepem_core.audit_log as audit
where audit.entity_type = 'facility'
  and audit.entity_key = facility.facility_key
  and audit.action = 'authorize_mapped_candidate_publication'
  and audit.request_id = '20260810233000';

delete from elepem_core.facility_geocodes
where provider = 'legacy'
  and query_original = 'ARANDU_MAPPED_CANDIDATE_WITHOUT_ADDRESS';

delete from elepem_core.facility_addresses as address
where address.address_line = 'Direccion no informada'
  and address.normalized_address = 'direccion no informada'
  and exists (
    select 1
    from elepem_core.facilities as facility
    where facility.id = address.facility_id
      and facility.origin_candidate_id is not null
  )
  and not exists (
    select 1
    from elepem_core.facility_geocodes as geocode
    where geocode.address_id = address.id
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
  'rollback_operator_authorized_mapped_candidates',
  'manual-rollback',
  jsonb_build_object('restored_from_request_id', '20260810233000'),
  '20260810233000-rollback'
where not exists (
  select 1
  from elepem_core.audit_log
  where entity_type = 'registry_migration'
    and entity_key = 'all-geolocated-candidates-2026-08-10'
    and request_id = '20260810233000-rollback'
  );

commit;
