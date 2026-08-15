-- Remove every price explicitly identified as synthetic/demo while preserving
-- facilities, official facts and any sourced real price.

begin;

update public.elepem
set precio_mensual_uyu = null,
    precio_fecha = null,
    precio_incluye = '{}'::text[],
    precio_fuente_url = null,
    precio_es_demo = false,
    updated_at = now()
where precio_es_demo;

update public.elepem_sin_ubicacion
set precio_mensual_uyu = null,
    precio_fecha = null,
    precio_incluye = '{}'::text[],
    precio_fuente_url = null,
    precio_es_demo = false,
    updated_at = now()
where precio_es_demo;

do $$
begin
  if to_regclass('elepem_core.facilities') is not null then
    execute $sql$
      update elepem_core.facilities
      set demo_monthly_price_uyu = null,
          updated_at = now()
      where demo_monthly_price_uyu is not null
    $sql$;
  end if;

  if to_regclass('elepem_core.facility_public_profiles') is not null
    and to_regclass('elepem_core.facilities') is not null then
    execute 'alter table elepem_core.facility_public_profiles
      alter column monthly_price_from_uyu drop not null,
      alter column price_as_of drop not null';
    execute $sql$
      update elepem_core.facility_public_profiles as profile
      set monthly_price_from_uyu = null,
          price_as_of = null,
          price_includes = '{}'::text[],
          updated_at = now()
      from elepem_core.facilities as facility
      where facility.id = profile.facility_id
        and facility.is_demo
        and profile.monthly_price_from_uyu is not null
    $sql$;
  end if;

  if to_regclass('arandu_demo.facilities') is not null then
    execute 'alter table arandu_demo.facilities
      alter column monthly_price_from_uyu drop not null,
      alter column price_as_of drop not null';
    execute $sql$
      update arandu_demo.facilities
      set monthly_price_from_uyu = null,
          price_as_of = null,
          price_includes = '{}'::text[],
          updated_at = now()
      where monthly_price_from_uyu is not null
    $sql$;
  end if;
end;
$$;

comment on column public.elepem.precio_es_demo is
  'Reserved marker for synthetic demonstration prices. No synthetic price is currently stored.';

do $$
declare
  remaining integer;
begin
  if exists (select 1 from public.elepem where precio_es_demo or precio_mensual_uyu is not null and precio_fuente_url is null) then
    raise exception 'Fictitious or unsourced price remains in public.elepem';
  end if;
  if exists (select 1 from public.elepem_sin_ubicacion where precio_es_demo) then
    raise exception 'Fictitious price remains in public.elepem_sin_ubicacion';
  end if;
  if to_regclass('elepem_core.facilities') is not null then
    execute 'select count(*) from elepem_core.facilities where demo_monthly_price_uyu is not null'
      into remaining;
    if remaining <> 0 then
      raise exception 'Fictitious source price remains in elepem_core.facilities';
    end if;
  end if;
  if to_regclass('arandu_demo.facilities') is not null then
    execute 'select count(*) from arandu_demo.facilities where monthly_price_from_uyu is not null'
      into remaining;
    if remaining <> 0 then
      raise exception 'Fictitious price remains in arandu_demo.facilities';
    end if;
  end if;
end;
$$;

commit;
