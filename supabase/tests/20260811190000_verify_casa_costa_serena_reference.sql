begin;

do $$
declare
  reference_id bigint;
begin
  select id into reference_id
  from elepem_core.facilities
  where facility_key = 'DEMO-ELEPEM-001'
    and is_demo = true
    and registry_visibility = 'public'
    and identity_status = 'confirmed_facility'
    and location_status = 'mapped';

  if reference_id is null then
    raise exception 'Casa Costa Serena is not a public canonical demo reference';
  end if;

  if (select count(*) from public.arandu_facilities_registry where id = 'DEMO-ELEPEM-001') <> 1 then
    raise exception 'Casa Costa Serena is not visible exactly once in the public registry';
  end if;

  if not exists (
    select 1 from elepem_core.facility_public_profiles
    where facility_id = reference_id
      and monthly_price_from_uyu = 78000
      and image_url = '/demo/elepem-costa-serena.webp'
  ) then
    raise exception 'Casa Costa Serena public profile is incomplete';
  end if;

  if exists (
    select 1 from public.intake_reports
    where demo_facility_id = 'DEMO-ELEPEM-001'
      and facility_id is distinct from reference_id
  ) then
    raise exception 'A Casa Costa Serena intake row is not linked to its canonical facility';
  end if;

  if (select count(*) from elepem_core.facilities where registry_msp_final) <> 212 then
    raise exception 'MSP invariant changed';
  end if;

  if (select count(*) from elepem_core.facilities where registry_mides_social) <> 275 then
    raise exception 'MIDES invariant changed';
  end if;
end;
$$;

rollback;
