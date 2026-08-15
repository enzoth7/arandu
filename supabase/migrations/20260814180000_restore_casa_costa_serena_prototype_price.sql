-- Restore the single isolated prototype price used by the public map and
-- price filter. Real ELEPEM rows remain untouched and require a source URL.

begin;

do $$
declare
  changed integer;
begin
  if to_regclass('arandu_demo.facilities') is null then
    raise exception 'arandu_demo.facilities does not exist';
  end if;

  update arandu_demo.facilities
  set monthly_price_from_uyu = 78000,
      price_as_of = date '2026-08-10',
      price_includes = array[
        'Alojamiento',
        'Cuatro comidas',
        'Actividades grupales',
        'Lavandería básica'
      ]::text[],
      updated_at = now()
  where id = 'DEMO-ELEPEM-001'
    and active
    and is_test;

  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Expected exactly one active Casa Costa Serena prototype row, updated %', changed;
  end if;

  if exists (
    select 1
    from arandu_demo.facilities
    where id <> 'DEMO-ELEPEM-001'
      and monthly_price_from_uyu is not null
  ) then
    raise exception 'Another isolated prototype facility still has a price';
  end if;

  if exists (
    select 1
    from public.elepem
    where precio_es_demo
      or (precio_mensual_uyu is not null and precio_fuente_url is null)
  ) then
    raise exception 'A real ELEPEM has a synthetic or unsourced price';
  end if;
end;
$$;

commit;
