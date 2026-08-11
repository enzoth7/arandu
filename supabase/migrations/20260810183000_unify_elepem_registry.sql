-- Arandu: one operational facility registry with explicit identity, location,
-- administrative and source-link states.
--
-- This migration is deliberately additive. Legacy and discovery tables remain
-- available for reconciliation and rollback; runtime consumers move to the
-- views created below only after the audited backfill succeeds.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table elepem_core.facilities
  add column if not exists identity_status text not null default 'confirmed_facility',
  add column if not exists registry_visibility text not null default 'held',
  add column if not exists location_status text not null default 'location_pending',
  add column if not exists registry_msp_final boolean not null default false,
  add column if not exists registry_mides_social boolean not null default false,
  add column if not exists primary_source_label text,
  add column if not exists primary_source_url text,
  add column if not exists source_link_status text not null default 'pending',
  add column if not exists demo_monthly_price_uyu integer,
  add column if not exists demo_price_as_of date,
  add column if not exists demo_price_includes text[] not null default '{}',
  add column if not exists migration_payload jsonb,
  add column if not exists origin_candidate_id bigint
    references discovery_private.facility_candidates (id)
    on update cascade on delete restrict;

alter table elepem_core.facilities
  add column if not exists administrative_status text
  generated always as (
    case
      when registry_msp_final then 'msp_habilitado'
      when registry_mides_social then 'mides_certificado'
      else 'situacion_no_confirmada'
    end
  ) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_identity_status_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_identity_status_check check (
        identity_status in ('confirmed_facility', 'pending_identity_review', 'duplicate', 'discarded')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_registry_visibility_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_registry_visibility_check check (
        registry_visibility in ('public', 'held', 'held_identity', 'held_location', 'archived')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_location_status_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_location_status_check check (
        location_status in ('mapped', 'location_pending', 'location_rejected')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_source_link_status_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_source_link_status_check check (
        source_link_status in ('verified', 'pending', 'unavailable')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_primary_source_label_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_primary_source_label_check check (
        primary_source_label is null or char_length(primary_source_label) between 1 and 200
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_primary_source_url_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_primary_source_url_check check (
        primary_source_url is null
        or (
          char_length(primary_source_url) <= 1000
          and primary_source_url ~* '^https?://'
          and primary_source_url !~* 'supabase\.co(?:/|$)'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_source_link_consistency_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_source_link_consistency_check check (
        (source_link_status = 'verified' and primary_source_label is not null and primary_source_url is not null)
        or source_link_status <> 'verified'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_demo_price_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_demo_price_check check (
        demo_monthly_price_uyu is null
        or (
          demo_monthly_price_uyu between 10000 and 500000
          and (registry_msp_final or registry_mides_social)
          and demo_price_as_of is not null
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'elepem_core.facilities'::regclass
      and conname = 'facilities_migration_payload_check'
  ) then
    alter table elepem_core.facilities
      add constraint facilities_migration_payload_check check (
        migration_payload is null or jsonb_typeof(migration_payload) = 'object'
      );
  end if;
end;
$$;

create unique index if not exists facilities_origin_candidate_key
  on elepem_core.facilities (origin_candidate_id)
  where origin_candidate_id is not null;
create index if not exists facilities_registry_state_idx
  on elepem_core.facilities (registry_visibility, identity_status, location_status);
create index if not exists facilities_administrative_status_idx
  on elepem_core.facilities (administrative_status);

create or replace function elepem_core.guard_registry_official_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    old.registry_msp_final is distinct from new.registry_msp_final
    or old.registry_mides_social is distinct from new.registry_mides_social
  ) and coalesce(current_setting('arandu.allow_official_snapshot_change', true), '') <> 'on' then
    raise exception using
      errcode = '55000',
      message = 'MSP/MIDES registry flags are frozen; use the audited analyst migration path';
  end if;
  return new;
end;
$$;

revoke all on function elepem_core.guard_registry_official_snapshot()
  from public, anon, authenticated, service_role;

drop trigger if exists facilities_guard_registry_official_snapshot
  on elepem_core.facilities;
create trigger facilities_guard_registry_official_snapshot
before update of registry_msp_final, registry_mides_social
on elepem_core.facilities
for each row execute function elepem_core.guard_registry_official_snapshot();

-- Existing normalized facilities are confirmed identities. Visibility remains
-- held until the separate reconciliation/backfill explicitly promotes them.
update elepem_core.facilities as facility
set
  identity_status = case
    when facility.lifecycle_status = 'merged' then 'duplicate'
    when facility.review_status = 'rejected' then 'discarded'
    else 'confirmed_facility'
  end,
  location_status = case
    when exists (
      select 1 from elepem_core.facility_geocodes as geocode
      where geocode.facility_id = facility.id and geocode.is_current
    ) then 'mapped'
    else 'location_pending'
  end,
  registry_visibility = case
    when facility.lifecycle_status in ('historical', 'closed', 'merged') then 'archived'
    else 'held'
  end
where facility.origin_candidate_id is null
  and facility.migration_payload is null;

-- Drop dependent views from the outside in so the migration can be replayed
-- safely after a partial deployment or during local verification.
drop view if exists public.arandu_facilities_identity_queue;
drop view if exists public.arandu_facilities_registry;
drop view if exists public.arandu_facility_source_links;
create view public.arandu_facility_source_links
with (security_invoker = true)
as
select distinct
  source.facility_id,
  source.source_label,
  source.source_url,
  source.source_type,
  source.source_date,
  source.retrieved_at
from (
  select
    facility.id as facility_id,
    'MSP'::text as source_label,
    'https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-06/ELEPEM%20HABILITADOS%20JUNIO%202026.pdf'::text as source_url,
    'official'::text as source_type,
    date '2026-06-30' as source_date,
    facility.updated_at as retrieved_at
  from elepem_core.facilities as facility
  where facility.registry_msp_final

  union all

  select
    facility.id,
    'MIDES'::text,
    'https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social'::text,
    'official'::text,
    null::date,
    facility.updated_at
  from elepem_core.facilities as facility
  where facility.registry_mides_social

  union all

  select
    link.facility_id,
    case
      when observation.source_url ilike '%instagram.com/%' then 'Instagram'
      when observation.source_url ilike '%facebook.com/%' then 'Facebook'
      when observation.source_type = 'openstreetmap' then 'OpenStreetMap'
      when observation.source_type = 'facility_website' then 'Sitio institucional'
      when observation.source_type = 'public_directory' then 'Directorio publico'
      when observation.source_type = 'news' then 'Medio de prensa'
      when observation.source_type = 'official' then coalesce(catalog.display_name, 'Organismo publico')
      else coalesce(catalog.display_name, 'Otra fuente publica')
    end,
    observation.source_url,
    observation.source_type,
    observation.source_date,
    observation.retrieved_at
  from elepem_core.facility_observation_links as link
  join discovery_private.facility_source_observations as observation
    on observation.id = link.observation_id
  left join elepem_core.source_catalog as catalog
    on catalog.id = observation.source_catalog_id
  where observation.source_url ~* '^https?://'
    and observation.source_url !~* 'supabase\.co(?:/|$)'
) as source;

drop view if exists public.arandu_facilities_registry;
create view public.arandu_facilities_registry
with (security_invoker = true)
as
select
  facility.facility_key as id,
  preferred_name.name,
  current_address.department,
  current_address.locality,
  current_address.address_line as address,
  current_capacity.places,
  current_geocode.lat,
  current_geocode.lng,
  current_geocode.precision,
  current_geocode.precision_label,
  case
    when facility.registry_msp_final then 'habilitado'
    when facility.registry_mides_social then 'registro'
    else 'verificar'
  end as status_group,
  facility.administrative_status as status_stage,
  case
    when facility.registry_msp_final then 'Habilitacion final MSP'
    when facility.registry_mides_social then 'Certificado Social MIDES'
    else 'Situacion no confirmada'
  end as status_short,
  coalesce(source_summary.source_label, 'Fuente pendiente de vincular') as source_label,
  source_summary.primary_source_url as source_url,
  coalesce(source_summary.source_links, '[]'::jsonb) as source_links,
  facility.registry_msp_final as msp_final,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'historical_registration'
  ) as msp_registro_historico,
  facility.registry_mides_social as mides_social,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'provider_registry'
  ) as pacp,
  exists (
    select 1 from public.arandu_facility_source_links as link
    where link.facility_id = facility.id and link.source_type <> 'official'
  ) as other_source,
  facility.demo_monthly_price_uyu,
  facility.demo_price_as_of,
  facility.demo_price_includes,
  facility.created_at,
  facility.updated_at
from elepem_core.facilities as facility
join lateral (
  select name.name
  from elepem_core.facility_names as name
  where name.facility_id = facility.id and name.is_preferred
  order by name.id desc limit 1
) as preferred_name on true
join lateral (
  select address.department, address.locality, address.address_line
  from elepem_core.facility_addresses as address
  where address.facility_id = facility.id
    and address.is_current and address.address_type = 'physical'
  order by address.id desc limit 1
) as current_address on true
join lateral (
  select geocode.lat, geocode.lng, geocode.precision, geocode.precision_label
  from elepem_core.facility_geocodes as geocode
  where geocode.facility_id = facility.id and geocode.is_current
  order by geocode.id desc limit 1
) as current_geocode on true
left join lateral (
  select capacity.places
  from elepem_core.facility_capacity_observations as capacity
  where capacity.facility_id = facility.id and capacity.is_current
  order by capacity.id desc limit 1
) as current_capacity on true
left join lateral (
  select
    string_agg(distinct link.source_label, ' + ') as source_label,
    (array_agg(link.source_url order by
      case link.source_label when 'MSP' then 1 when 'MIDES' then 2 when 'Instagram' then 3 when 'Facebook' then 4 else 5 end,
      link.source_url
    ))[1] as primary_source_url,
    jsonb_agg(
      jsonb_build_object(
        'label', link.source_label,
        'url', link.source_url,
        'sourceDate', link.source_date,
        'retrievedAt', link.retrieved_at
      ) order by
        case link.source_label when 'MSP' then 1 when 'MIDES' then 2 when 'Instagram' then 3 when 'Facebook' then 4 else 5 end,
        link.source_url
    ) as source_links
  from public.arandu_facility_source_links as link
  where link.facility_id = facility.id
) as source_summary on true
where facility.lifecycle_status = 'current'
  and facility.identity_status = 'confirmed_facility'
  and facility.registry_visibility = 'public'
  and facility.location_status = 'mapped';

drop view if exists public.arandu_facilities_identity_queue;
create view public.arandu_facilities_identity_queue
with (security_invoker = true)
as
select
  facility.id as facility_id,
  facility.facility_key,
  facility.origin_candidate_id,
  facility.identity_status,
  facility.location_status,
  facility.registry_visibility,
  facility.primary_source_label,
  facility.primary_source_url,
  facility.source_link_status,
  facility.migration_payload,
  facility.created_at,
  facility.updated_at
from elepem_core.facilities as facility
where facility.identity_status in ('pending_identity_review', 'duplicate', 'discarded')
   or facility.registry_visibility in ('held_identity', 'held_location');

revoke all on table
  public.arandu_facility_source_links,
  public.arandu_facilities_registry,
  public.arandu_facilities_identity_queue
from public, anon, authenticated, service_role;

comment on column elepem_core.facilities.registry_msp_final is
  'Frozen June 2026 MSP public-registry fact. Demo and institutional APIs cannot modify it.';
comment on column elepem_core.facilities.registry_mides_social is
  'Frozen MIDES public-registry fact. Demo and institutional APIs cannot modify it.';
comment on column elepem_core.facilities.migration_payload is
  'Lossless copy of legacy/candidate fields that do not yet have a typed canonical destination.';
comment on view public.arandu_facilities_registry is
  'Single mapped public registry. MSP/MIDES are frozen facts; every other visible row is situacion no confirmada.';
comment on view public.arandu_facility_source_links is
  'Clickable public origin links; local JSON paths and Supabase migration placeholders are excluded.';

commit;
