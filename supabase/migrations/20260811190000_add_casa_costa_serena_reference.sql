-- One internally flagged reference ELEPEM for the institutional demonstration.
-- It uses the same canonical identity, public registry and intake relationships
-- as every other public facility, without changing MSP or MIDES snapshots.

begin;

alter table elepem_core.facilities
  add column if not exists is_demo boolean not null default false;

create index if not exists facilities_demo_reference_idx
  on elepem_core.facilities (facility_key)
  where is_demo = true;

create table if not exists elepem_core.facility_public_profiles (
  facility_id bigint primary key
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  description text not null
    check (char_length(btrim(description)) between 10 and 2000),
  image_url text not null
    check (char_length(image_url) between 1 and 1000 and image_url ~ '^(https?://|/)'),
  image_alt text not null
    check (char_length(btrim(image_alt)) between 5 and 300),
  contact_phone text
    check (contact_phone is null or char_length(btrim(contact_phone)) between 6 and 24),
  contact_email text
    check (contact_email is null or char_length(btrim(contact_email)) between 3 and 254),
  monthly_price_from_uyu integer not null
    check (monthly_price_from_uyu between 10000 and 10000000),
  price_as_of date not null,
  price_includes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table elepem_core.facility_public_profiles enable row level security;
alter table elepem_core.facility_public_profiles force row level security;
revoke all on table elepem_core.facility_public_profiles
  from public, anon, authenticated, service_role;

drop trigger if exists facility_public_profiles_touch_updated_at
  on elepem_core.facility_public_profiles;
create trigger facility_public_profiles_touch_updated_at
before update on elepem_core.facility_public_profiles
for each row execute function elepem_core.touch_updated_at();

do $$
declare
  reference_facility_id bigint;
  reference_address_id bigint;
begin
  insert into elepem_core.facilities (
    facility_key,
    lifecycle_status,
    review_status,
    publication_status,
    identity_status,
    registry_visibility,
    location_status,
    registry_msp_final,
    registry_mides_social,
    primary_source_label,
    source_link_status,
    migration_payload,
    is_demo
  ) values (
    'DEMO-ELEPEM-001',
    'current',
    'verified',
    'eligible',
    'confirmed_facility',
    'public',
    'mapped',
    false,
    false,
    'Referencia institucional de Arandú',
    'pending',
    jsonb_build_object(
      'purpose', 'institutional_reference',
      'createdByMigration', '20260811190000_add_casa_costa_serena_reference'
    ),
    true
  )
  on conflict (facility_key) do update set
    lifecycle_status = excluded.lifecycle_status,
    review_status = excluded.review_status,
    publication_status = excluded.publication_status,
    identity_status = excluded.identity_status,
    registry_visibility = excluded.registry_visibility,
    location_status = excluded.location_status,
    primary_source_label = excluded.primary_source_label,
    source_link_status = excluded.source_link_status,
    migration_payload = coalesce(elepem_core.facilities.migration_payload, '{}'::jsonb)
      || excluded.migration_payload,
    is_demo = true,
    updated_at = now()
  returning id into reference_facility_id;

  if not exists (
    select 1 from elepem_core.facility_reviews
    where facility_id = reference_facility_id
      and reviewer_identifier = 'migration:20260811190000'
  ) then
    insert into elepem_core.facility_reviews (
      facility_id, review_type, outcome, evidence_tier,
      reviewer_identifier, review_note
    ) values (
      reference_facility_id,
      'publication',
      'needs_more_evidence',
      'C',
      'migration:20260811190000',
      'Referencia ficticia solicitada para demostrar el circuito institucional; no constituye evidencia oficial.'
    );
  end if;

  update elepem_core.facility_names
  set name = 'Casa Costa Serena',
      normalized_name = 'casa costa serena',
      name_type = 'canonical',
      valid_to = null
  where facility_id = reference_facility_id and is_preferred;

  if not found then
    insert into elepem_core.facility_names (
      facility_id, name, normalized_name, name_type, is_preferred
    ) values (
      reference_facility_id, 'Casa Costa Serena', 'casa costa serena', 'canonical', true
    );
  end if;

  update elepem_core.facility_addresses
  set address_line = 'Camino de la Costa 101',
      normalized_address = 'camino de la costa 101',
      locality = 'Canelones',
      department = 'Canelones',
      valid_to = null
  where facility_id = reference_facility_id
    and is_current and address_type = 'physical'
  returning id into reference_address_id;

  if not found then
    insert into elepem_core.facility_addresses (
      facility_id, address_line, normalized_address, locality, department,
      address_type, is_current
    ) values (
      reference_facility_id, 'Camino de la Costa 101', 'camino de la costa 101',
      'Canelones', 'Canelones', 'physical', true
    ) returning id into reference_address_id;
  end if;

  update elepem_core.facility_geocodes
  set address_id = reference_address_id,
      provider = 'manual',
      query_original = 'Casa Costa Serena, Canelones',
      query_normalized = 'casa costa serena canelones',
      lat = -34.5228,
      lng = -56.2778,
      precision = 'referencial',
      precision_label = 'Ubicacion de referencia',
      confidence = 1,
      provider_response = jsonb_build_object('purpose', 'institutional_reference'),
      manually_corrected = true,
      reviewed_by = 'migration:20260811190000',
      checked_at = timestamptz '2026-08-11 00:00:00+00'
  where facility_id = reference_facility_id and is_current;

  if not found then
    insert into elepem_core.facility_geocodes (
      facility_id, address_id, provider, query_original, query_normalized,
      lat, lng, precision, precision_label, confidence, provider_response,
      manually_corrected, reviewed_by, checked_at, is_current
    ) values (
      reference_facility_id, reference_address_id, 'manual',
      'Casa Costa Serena, Canelones', 'casa costa serena canelones',
      -34.5228, -56.2778, 'referencial', 'Ubicacion de referencia', 1,
      jsonb_build_object('purpose', 'institutional_reference'),
      true, 'migration:20260811190000', timestamptz '2026-08-11 00:00:00+00', true
    );
  end if;

  insert into elepem_core.facility_public_profiles (
    facility_id, description, image_url, image_alt,
    contact_phone, contact_email, monthly_price_from_uyu,
    price_as_of, price_includes
  ) values (
    reference_facility_id,
    'Rutinas tranquilas, talleres de huerta y espacios comunes accesibles en una casa de una sola planta.',
    '/demo/elepem-costa-serena.webp',
    'Acceso principal de Casa Costa Serena',
    null,
    null,
    78000,
    date '2026-08-10',
    array['Alojamiento', 'Cuatro comidas', 'Actividades grupales', 'Lavanderia basica']
  )
  on conflict (facility_id) do update set
    description = excluded.description,
    image_url = excluded.image_url,
    image_alt = excluded.image_alt,
    contact_phone = excluded.contact_phone,
    contact_email = excluded.contact_email,
    monthly_price_from_uyu = excluded.monthly_price_from_uyu,
    price_as_of = excluded.price_as_of,
    price_includes = excluded.price_includes;

  update public.intake_reports
  set facility_id = reference_facility_id,
      updated_at = now()
  where demo_facility_id = 'DEMO-ELEPEM-001'
    and facility_id is null;

  if not exists (
    select 1 from elepem_core.audit_log
    where entity_type = 'facility'
      and entity_key = 'DEMO-ELEPEM-001'
      and request_id = 'migration:20260811190000'
  ) then
    insert into elepem_core.audit_log (
      entity_type, entity_key, action, actor_identifier, after_state, request_id
    ) values (
      'facility',
      'DEMO-ELEPEM-001',
      'institutional_reference_published',
      'migration:20260811190000',
      jsonb_build_object('isDemo', true, 'registryVisibility', 'public'),
      'migration:20260811190000'
    );
  end if;
end;
$$;

commit;
