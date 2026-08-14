-- Synthetic-only fixture for exercising the flat ELEPEM cutover in a
-- disposable database. It mirrors aggregate production counts without
-- copying names, addresses, contacts, reports or other live content.

begin;

insert into discovery_private.facility_source_runs (
  run_key, source_type, source_url, storage_policy, status,
  started_at, completed_at, observation_count
) values (
  'synthetic-validation-20260813', 'official',
  'https://example.org/arandu-validation', 'normalized_only',
  'succeeded', now(), now(), 1
);

insert into discovery_private.facility_source_observations (
  run_id, source_type, source_record_key, source_url, retrieved_at,
  source_date, storage_policy, normalized_name, normalized_department,
  normalized_locality, normalized_address, record_hash
)
select
  id, 'official', 'SYNTHETIC-VALIDATION',
  'https://example.org/arandu-validation', now(), date '2026-08-13',
  'normalized_only', 'Padrón sintético', 'Montevideo', 'Montevideo',
  'Dirección sintética', repeat('a', 64)
from discovery_private.facility_source_runs
where run_key = 'synthetic-validation-20260813';

insert into elepem_core.facilities (
  facility_key, lifecycle_status, review_status, publication_status,
  identity_status, registry_visibility, location_status,
  registry_msp_final, registry_mides_social,
  primary_source_label, primary_source_url, source_link_status,
  demo_monthly_price_uyu, demo_price_as_of, demo_price_includes, is_demo
)
select
  'ELEPEM-' || lpad(g::text, 4, '0'),
  'current', 'verified', 'private', 'confirmed_facility',
  case when g <= 1019 then 'public' else 'held_location' end,
  case when g <= 1019 then 'mapped' else 'location_pending' end,
  g between 1 and 212,
  (g between 1 and 170) or (g between 213 and 317),
  'Validación sintética', 'https://example.org/arandu-validation', 'verified',
  case when g <= 317 then 50000 + g else null end,
  case when g <= 317 then date '2026-08-01' else null end,
  case when g <= 317 then array['Alojamiento']::text[] else '{}'::text[] end,
  false
from generate_series(1, 1102) as g;

insert into elepem_core.facilities (
  facility_key, lifecycle_status, review_status, publication_status,
  identity_status, registry_visibility, location_status,
  registry_msp_final, registry_mides_social,
  primary_source_label, primary_source_url, source_link_status, is_demo
) values (
  'DEMO-ELEPEM-001', 'current', 'verified', 'private',
  'confirmed_facility', 'held', 'mapped', true, true,
  'Referencia ficticia', 'https://example.org/demo', 'verified', true
);

-- Mirror the 26 current unlocated rows that have department/locality on their
-- origin candidate but no normalized address row at all.
insert into discovery_private.facility_candidates (
  candidate_key, status, normalized_name, normalized_department,
  normalized_locality, normalized_address
)
select
  'SYNTHETIC-UNLOCATED-' || g,
  'needs_review',
  'elepem sintetico ' || g,
  'Canelones',
  'Localidad sintética',
  null
from generate_series(1020, 1045) as g;

update elepem_core.facilities as facility
set origin_candidate_id = candidate.id
from discovery_private.facility_candidates as candidate
where facility.facility_key = replace(candidate.candidate_key, 'SYNTHETIC-UNLOCATED-', 'ELEPEM-');

insert into elepem_core.facility_names (
  facility_id, name, normalized_name, name_type, is_preferred, observation_id
)
select
  facility.id,
  case when facility.is_demo then 'Casa Costa Serena (demo)'
       else 'ELEPEM sintético ' || facility.id end,
  case when facility.is_demo then 'casa costa serena demo'
       else 'elepem sintetico ' || facility.id end,
  'canonical', true, observation.id
from elepem_core.facilities as facility
cross join discovery_private.facility_source_observations as observation
where observation.source_record_key = 'SYNTHETIC-VALIDATION';

insert into elepem_core.facility_addresses (
  facility_id, address_line, normalized_address, locality, department,
  address_type, is_current, observation_id
)
select
  facility.id,
  'Calle sintética ' || facility.id,
  'calle sintetica ' || facility.id,
  case when facility.is_demo then 'Punta Carretas' else 'Localidad sintética' end,
  case
    when facility.is_demo then 'Montevideo'
    when split_part(facility.facility_key, '-', 2)::integer <= 117 then 'Canelones'
    when split_part(facility.facility_key, '-', 2)::integer between 1020 and 1058 then 'Canelones'
    else 'Montevideo'
  end,
  'physical', true, observation.id
from elepem_core.facilities as facility
cross join discovery_private.facility_source_observations as observation
where observation.source_record_key = 'SYNTHETIC-VALIDATION'
  and (
    facility.is_demo
    or split_part(facility.facility_key, '-', 2)::integer not between 1020 and 1045
  );

insert into elepem_core.facility_geocodes (
  facility_id, address_id, provider, lat, lng, precision, precision_label,
  confidence, manually_corrected, checked_at, is_current, observation_id
)
select
  facility.id, address.id, 'manual',
  -34.95 + ((facility.id % 100)::double precision / 10000),
  -56.20 + ((facility.id % 100)::double precision / 10000),
  'puerta', 'Ubicación sintética', 1, false, now(), true, observation.id
from elepem_core.facilities as facility
join elepem_core.facility_addresses as address
  on address.facility_id = facility.id and address.is_current
cross join discovery_private.facility_source_observations as observation
where (facility.registry_visibility = 'public' and facility.location_status = 'mapped'
       or facility.is_demo)
  and observation.source_record_key = 'SYNTHETIC-VALIDATION';

insert into elepem_core.facility_observation_links (
  facility_id, observation_id, evidence_role, independence_key, linked_by
)
select
  facility.id, observation.id, 'evidence_a', 'synthetic-validation',
  'codex-disposable-validation'
from elepem_core.facilities as facility
cross join discovery_private.facility_source_observations as observation
where observation.source_record_key = 'SYNTHETIC-VALIDATION';

insert into public.residenciales (
  id, name, department, locality, address, places, lat, lng, precision,
  precision_label, status_group, status_stage, status_short, source_label,
  msp_final, msp_registro_historico, mides_social, pacp, other_source
)
select
  'legacy-' || lpad(g::text, 4, '0'), 'ELEPEM sintético ' || g,
  case when g <= 118 then 'Canelones' else 'Montevideo' end,
  'Localidad sintética', 'Calle sintética ' || g, null,
  -34.95 + ((g % 100)::double precision / 10000),
  -56.20 + ((g % 100)::double precision / 10000),
  'puerta', 'Ubicación sintética',
  case when g <= 212 then 'habilitado'
       when g between 213 and 317 then 'registro'
       else 'verificar' end,
  'Validación', 'Validación sintética', 'Validación sintética',
  g <= 212, false, (g between 1 and 170) or (g between 213 and 317), false,
  g > 317
from generate_series(1, 800) as g;

insert into elepem_core.legacy_facility_map (
  legacy_residencial_id, facility_id, mapping_status, match_method,
  confidence, mapped_by, mapped_at
)
select
  'legacy-' || lpad(g::text, 4, '0'), facility.id,
  'mapped', 'exact_id', 1,
  'codex-disposable-validation', now()
from generate_series(1, 800) as g
join elepem_core.facilities as facility
  on facility.facility_key = 'ELEPEM-' || lpad(g::text, 4, '0');

insert into elepem_core.facility_public_profiles (
  facility_id, description, image_url, image_alt, contact_phone,
  contact_email, monthly_price_from_uyu, price_as_of, price_includes
)
select
  id, 'Perfil completamente ficticio para pruebas.',
  '/demo/casa-costa-serena.svg', 'Imagen ficticia',
  '+598 000 001 001', 'costa-serena@demo.invalid',
  88000, date '2026-08-01', array['Alojamiento']::text[]
from elepem_core.facilities
where facility_key = 'DEMO-ELEPEM-001';

-- Synthetic backend references exercise the real NOT NULL/FK cutover for
-- experiences, approved changes and document reviews without copying intake
-- or personal content from production.
insert into public.intake_reports (
  id, case_code, source, priority, report_payload, current_status,
  entry_type, is_demo, demo_facility_id, payload_version, submitted_actor,
  facility_id
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'AM-20260814-00000001', 'web', 'Baja', '{}'::jsonb, 'closed',
    'experience', true, 'DEMO-ELEPEM-001', 3, 'state',
    (select id from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001')
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'AM-20260814-00000002', 'web', 'Baja', '{}'::jsonb, 'resolved',
    'facility_change', true, 'DEMO-ELEPEM-001', 3, 'state',
    (select id from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001')
  );

insert into elepem_core.facility_experience_publications (
  id, report_id, facility_id, status, public_body, public_relationship,
  public_period, reviewer_identifier, previewed_at, published_at,
  withdrawn_at, withdrawal_reason, created_at, updated_at
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  (select id from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001'),
  'withdrawn', 'Relato completamente ficticio para validar la migración.',
  'Persona ficticia', '2026', 'codex-disposable-validation',
  now() - interval '3 hours', now() - interval '2 hours',
  now() - interval '1 hour', 'Retiro ficticio durante la validación.',
  now() - interval '3 hours', now() - interval '1 hour'
);

insert into public.facility_change_publications (
  id, report_id, facility_id, remove_current_photo, reviewer
) values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  (select id from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001'),
  false, 'codex-disposable-validation'
);

insert into public.facility_document_status_reviews (
  id, facility_id, decision, reason, reviewer
) values (
  '40000000-0000-4000-8000-000000000001',
  (select id from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001'),
  'clear', 'Decisión completamente ficticia para validar la migración.',
  'codex-disposable-validation'
);

commit;
