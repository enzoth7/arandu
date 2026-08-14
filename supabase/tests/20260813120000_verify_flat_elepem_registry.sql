begin read only;

set local statement_timeout = '30s';

set local role service_role;
select count(*) as service_role_experience_view_probe
from public.facility_experiences_published;
reset role;

do $$
declare
  isolated_fk_count integer;
  isolated_consumer_count integer;
begin
  if to_regclass('public.elepem') is null
    or to_regclass('public.elepem_sin_ubicacion') is null then
    raise exception 'The two flat ELEPEM tables are missing';
  end if;

  if (select count(*) from public.elepem) <> 1019
    or (select count(*) from public.elepem_sin_ubicacion) <> 83 then
    raise exception 'Expected 1019 mapped and 83 isolated ELEPEM rows';
  end if;

  if (select count(*) from public.elepem where msp_habilitado) <> 212
    or (select count(*) from public.elepem where mides_certificado) <> 275
    or (select count(*) from public.elepem where msp_habilitado and mides_certificado) <> 170
    or (select count(*) from public.elepem where not msp_habilitado and not mides_certificado) <> 702 then
    raise exception 'National KPI values do not match the approved baseline';
  end if;

  if (select count(*) from public.elepem where departamento = 'Canelones') <> 117
    or (select count(*) from public.elepem_sin_ubicacion where departamento = 'Canelones') <> 39 then
    raise exception 'Canelones must contain 117 mapped and 39 isolated rows after full reconciliation';
  end if;
  if (select count(*) from public.elepem_sin_ubicacion where direccion is null) <> 26 then
    raise exception 'Exactly 26 isolated rows must preserve a genuinely missing address as null';
  end if;

  if (select count(*) from public.elepem where precio_es_demo) <> 317
    or exists (
      select 1 from public.elepem
      where precio_es_demo and (precio_mensual_uyu is null or precio_fecha is null)
    )
    or exists (
      select 1 from public.elepem
      where precio_mensual_uyu is not null and not precio_es_demo and precio_fuente_url is null
    ) then
    raise exception 'Price provenance or the 317 synthetic-price markers are invalid';
  end if;

  if exists (
    select 1 from public.elepem
    where situacion <> case
      when msp_habilitado then 'habilitacion_msp'
      when mides_certificado then 'certificado_social_mides'
      else 'situacion_no_confirmada'
    end
  ) then
    raise exception 'The generated situacion value is inconsistent';
  end if;

  if exists (
    select 1 from public.elepem
    where cardinality(fuentes_referencias) <> cardinality(fuentes_urls)
       or cardinality(fuentes_urls) <> cardinality(fuentes_tipos)
       or cardinality(fuentes_tipos) <> cardinality(fuentes_proveedores)
       or cardinality(fuentes_proveedores) <> cardinality(fuentes_fechas)
       or cardinality(fuentes_fechas) <> cardinality(fuentes_consultadas_at)
       or cardinality(fuentes_consultadas_at) <> cardinality(fuentes_campos_respaldados)
  ) or exists (
    select 1 from public.elepem_sin_ubicacion
    where cardinality(fuentes_referencias) <> cardinality(fuentes_urls)
       or cardinality(fuentes_urls) <> cardinality(fuentes_tipos)
       or cardinality(fuentes_tipos) <> cardinality(fuentes_proveedores)
       or cardinality(fuentes_proveedores) <> cardinality(fuentes_fechas)
       or cardinality(fuentes_fechas) <> cardinality(fuentes_consultadas_at)
       or cardinality(fuentes_consultadas_at) <> cardinality(fuentes_campos_respaldados)
  ) then
    raise exception 'At least one aligned source list is corrupt';
  end if;

  if exists (
    select 1 from public.elepem, unnest(fuentes_urls) as source_url
    where source_url ~* '^https?://[^/]*supabase\.co(?:/|$)'
       or source_url ~* '^https?://(?:[^/]*\.)?google\.[^/]+/maps(?:/|$)'
       or source_url ~* '^https?://maps\.app\.goo\.gl(?:/|$)'
  ) then
    raise exception 'A prohibited internal or non-manual Google source URL was copied';
  end if;

  select count(*) into isolated_fk_count
  from pg_constraint
  where contype = 'f' and conrelid = 'public.elepem_sin_ubicacion'::regclass;
  if isolated_fk_count <> 0 then
    raise exception 'The isolated table must not have foreign keys';
  end if;

  select count(*) into isolated_consumer_count
  from pg_constraint
  where contype = 'f' and confrelid = 'public.elepem_sin_ubicacion'::regclass;
  if isolated_consumer_count <> 0 then
    raise exception 'No table may reference the isolated table';
  end if;

  if has_table_privilege('anon', 'public.elepem', 'select')
    or has_table_privilege('authenticated', 'public.elepem', 'select')
    or has_table_privilege('anon', 'public.elepem_sin_ubicacion', 'select')
    or has_table_privilege('authenticated', 'public.elepem_sin_ubicacion', 'select')
    or has_table_privilege('service_role', 'public.elepem_sin_ubicacion', 'select') then
    raise exception 'Direct access is broader than the approved security model';
  end if;
  if not has_schema_privilege('service_role', 'arandu_demo', 'usage')
    or not has_column_privilege('service_role', 'arandu_demo.facilities', 'id', 'select')
    or has_column_privilege('service_role', 'arandu_demo.facilities', 'name', 'select') then
    raise exception 'The service role demo grant is missing or broader than the one-column contract';
  end if;

  if exists (
    select 1 from public.elepem where codigo like 'DEMO-%'
  ) or not exists (
    select 1 from arandu_demo.facilities where id = 'DEMO-ELEPEM-001' and is_test
  ) then
    raise exception 'Demo data is not fully isolated from the real registry';
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
    raise exception 'A retained backend relation has an orphan ELEPEM id';
  end if;

  if exists (
    select 1
    from elepem_core.facility_experience_publications as publication
    join public.intake_reports as report on report.id = publication.report_id
    where report.entry_type <> 'experience'
      and publication.status <> 'withdrawn'
  ) then
    raise exception 'A non-experience report has an active experience publication';
  end if;
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'elepem_core.facility_experience_publications'::regclass
      and tgname = 'facility_experience_publications_validate_report'
      and pg_get_triggerdef(oid) ilike '%UPDATE OF report_id, facility_id, demo_facility_id, status%'
  ) then
    raise exception 'Experience publication status changes are not protected by the ownership trigger';
  end if;

  if to_regclass('public.residenciales') is null
    or to_regclass('elepem_core.facilities') is null
    or to_regclass('discovery_private.facility_candidates') is null then
    raise exception 'Phase one must keep legacy objects for rollback';
  end if;
end;
$$;

rollback;
