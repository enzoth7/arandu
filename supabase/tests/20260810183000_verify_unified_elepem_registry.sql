-- Run only against a disposable local/test database after the migration.
begin;

do $$
declare
  fixture_observation_id bigint;
  internal_observation_id bigint;
  fixture_facility_id bigint;
  public_rows integer;
  source_rows integer;
  guard_blocked boolean := false;
  price_blocked boolean := false;
begin
  insert into elepem_core.source_catalog (
    source_key, display_name, source_type, source_channel,
    base_url, authority_level, storage_policy
  ) values (
    'test:instagram', 'Instagram de prueba', 'social_public_url',
    'public_social_sources', 'https://www.instagram.com/arandu.test/',
    'lead', 'reference_only'
  ) on conflict (source_key) do update set updated_at = now();

  insert into discovery_private.facility_source_runs (
    run_key, source_type, source_url, storage_policy, status,
    started_at, completed_at, observation_count
  ) values (
    'test-unified-registry', 'social_public_url',
    'https://www.instagram.com/arandu.test/', 'reference_only',
    'succeeded', now(), now(), 1
  ) on conflict (run_key) do nothing;

  insert into discovery_private.facility_source_observations (
    run_id, source_type, source_record_key, source_url, retrieved_at,
    storage_policy, human_note,
    raw_metadata_storage_permitted, record_hash
  )
  select run.id, 'social_public_url', 'fixture:1',
    'https://www.instagram.com/arandu.test/', now(), 'reference_only',
    'Fixture local de fuente clickeable', false, repeat('b', 64)
  from discovery_private.facility_source_runs as run
  where run.run_key = 'test-unified-registry'
  on conflict (run_id, source_type, source_record_key) do update set retrieved_at = excluded.retrieved_at
  returning id into fixture_observation_id;

  if fixture_observation_id is null then
    select observation.id into fixture_observation_id
    from discovery_private.facility_source_observations as observation
    join discovery_private.facility_source_runs as run on run.id = observation.run_id
    where run.run_key = 'test-unified-registry' and observation.source_record_key = 'fixture:1';
  end if;

  insert into elepem_core.facilities (
    facility_key, lifecycle_status, review_status, publication_status,
    identity_status, registry_visibility, location_status,
    registry_msp_final, registry_mides_social,
    primary_source_label, primary_source_url, source_link_status,
    demo_monthly_price_uyu, demo_price_as_of
  ) values (
    'FAC-TEST-UNIFIED-001', 'current', 'verified', 'private',
    'confirmed_facility', 'public', 'mapped', true, false,
    'MSP',
    'https://www.gub.uy/ministerio-salud-publica/',
    'verified', 65000, current_date
  ) returning id into fixture_facility_id;

  insert into elepem_core.facility_names (
    facility_id, name, normalized_name, name_type, is_preferred, observation_id
  ) values (fixture_facility_id, 'Residencial Prueba', 'residencial prueba', 'canonical', true, fixture_observation_id);

  insert into elepem_core.facility_addresses (
    facility_id, address_line, normalized_address, locality, department,
    address_type, is_current, observation_id
  ) values (
    fixture_facility_id, 'Prueba 1234', 'prueba 1234', 'Montevideo', 'Montevideo',
    'physical', true, fixture_observation_id
  );

  insert into elepem_core.facility_geocodes (
    facility_id, address_id, provider, lat, lng, precision,
    precision_label, checked_at, is_current, observation_id
  )
  select fixture_facility_id, address.id, 'manual', -34.9, -56.2, 'puerta',
    'Fixture local', now(), true, fixture_observation_id
  from elepem_core.facility_addresses as address
  where address.facility_id = fixture_facility_id and address.is_current;

  insert into elepem_core.facility_observation_links (
    facility_id, observation_id, evidence_role, independence_key, linked_by
  ) values (fixture_facility_id, fixture_observation_id, 'evidence_b', 'test:instagram', 'sql-test');

  insert into discovery_private.facility_source_runs (
    run_key, source_type, source_url, storage_policy, status,
    started_at, completed_at, observation_count
  ) values (
    'test-unified-registry-internal', 'official',
    'https://fixture.supabase.co/storage/v1/object/public/internal/source.json',
    'normalized_only', 'succeeded', now(), now(), 1
  ) on conflict (run_key) do nothing;

  insert into discovery_private.facility_source_observations (
    run_id, source_type, source_record_key, source_url, retrieved_at,
    storage_policy, normalized_name, normalized_department,
    normalized_locality, normalized_address, human_note,
    raw_metadata_storage_permitted, record_hash
  )
  select run.id, 'official', 'fixture:internal',
    'https://fixture.supabase.co/storage/v1/object/public/internal/source.json',
    now(), 'normalized_only', 'residencial prueba', 'Montevideo',
    'Montevideo', 'Prueba 1234', 'Fixture de URL interna no publicable',
    false, repeat('c', 64)
  from discovery_private.facility_source_runs as run
  where run.run_key = 'test-unified-registry-internal'
  on conflict (run_id, source_type, source_record_key) do update set retrieved_at = excluded.retrieved_at
  returning id into internal_observation_id;

  insert into elepem_core.facility_observation_links (
    facility_id, observation_id, evidence_role, independence_key, linked_by
  ) values (fixture_facility_id, internal_observation_id, 'context', 'test:internal', 'sql-test');

  select count(*) into public_rows
  from public.arandu_facilities_registry where id = 'FAC-TEST-UNIFIED-001';
  if public_rows <> 1 then raise exception 'Mapped confirmed facility is missing from unified registry'; end if;

  select count(*) into source_rows
  from public.arandu_facility_source_links
  where facility_id = fixture_facility_id
    and source_url in (
      'https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-06/ELEPEM%20HABILITADOS%20JUNIO%202026.pdf',
      'https://www.instagram.com/arandu.test/'
    );
  if source_rows <> 2 then raise exception 'Clickable MSP and Instagram links were not preserved'; end if;

  begin
    update elepem_core.facilities
    set registry_msp_final = false
    where id = fixture_facility_id;
  exception when sqlstate '55000' then
    guard_blocked := true;
  end;
  if not guard_blocked then raise exception 'Frozen MSP/MIDES flags can be changed without audit override'; end if;

  begin
    insert into elepem_core.facilities (
      facility_key, demo_monthly_price_uyu, demo_price_as_of
    ) values ('FAC-TEST-INVALID-PRICE', 50000, current_date);
  exception when check_violation then
    price_blocked := true;
  end;
  if not price_blocked then raise exception 'Unconfirmed facility accepted a demo price'; end if;

  if exists (
    select 1 from public.arandu_facility_source_links
    where source_url ilike '%supabase.co%'
  ) then raise exception 'Internal Supabase URL leaked as a public source'; end if;
end;
$$;

rollback;
