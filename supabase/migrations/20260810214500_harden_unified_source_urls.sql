-- Correct the URL filter used by the unified source view. The source
-- observations remain untouched for audit; only public/derived fields exclude
-- internal Supabase Storage URLs.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table elepem_core.facilities
  drop constraint if exists facilities_primary_source_url_check;

update elepem_core.facilities
set
  primary_source_label = null,
  primary_source_url = null,
  source_link_status = 'pending'
where primary_source_url ~* '^https?://[^/]*supabase\.co(?:/|$)';

alter table elepem_core.facilities
  add constraint facilities_primary_source_url_check check (
    primary_source_url is null
    or (
      char_length(primary_source_url) <= 1000
      and primary_source_url ~* '^https?://'
      and primary_source_url !~* '^https?://[^/]*supabase\.co(?:/|$)'
    )
  );

create or replace view public.arandu_facility_source_links
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
      when observation.source_type = 'public_directory' then 'Directorio público'
      when observation.source_type = 'news' then 'Medio de prensa'
      when observation.source_type = 'official' then coalesce(catalog.display_name, 'Organismo público')
      else coalesce(catalog.display_name, 'Otra fuente pública')
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
    and observation.source_url !~* '^https?://[^/]*supabase\.co(?:/|$)'
) as source;

update elepem_core.facilities as facility
set
  primary_source_label = source.source_label,
  primary_source_url = source.source_url,
  source_link_status = case when source.source_url is null then 'pending' else 'verified' end
from elepem_core.facilities as target
left join lateral (
  select link.source_label, link.source_url
  from public.arandu_facility_source_links as link
  where link.facility_id = target.id
  order by
    case link.source_label when 'MSP' then 1 when 'MIDES' then 2
      when 'Instagram' then 3 when 'Facebook' then 4 else 5 end,
    link.source_url
  limit 1
) as source on true
where facility.id = target.id;

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier, after_state, request_id
)
select
  'registry_migration',
  'arandu-unified-source-url-hardening-2026-08-10',
  'exclude_internal_source_urls',
  'arandu-unified-registry-migration',
  jsonb_build_object(
    'source_observations_deleted', 0,
    'legacy_rows_changed', 0,
    'automatic_publication', false
  ),
  '20260810214500'
where not exists (
  select 1 from elepem_core.audit_log
  where entity_type = 'registry_migration'
    and entity_key = 'arandu-unified-source-url-hardening-2026-08-10'
    and request_id = '20260810214500'
);

do $$
begin
  if exists (
    select 1 from public.arandu_facility_source_links
    where source_url ~* '^https?://[^/]*supabase\.co(?:/|$)'
  ) then
    raise exception 'Internal Supabase URL remains in unified source links';
  end if;
  if exists (
    select 1 from elepem_core.facilities
    where primary_source_url ~* '^https?://[^/]*supabase\.co(?:/|$)'
  ) then
    raise exception 'Internal Supabase URL remains as a primary source';
  end if;
end;
$$;

commit;
