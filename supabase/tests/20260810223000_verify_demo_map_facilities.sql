begin;

do $$
declare
  demo_count integer;
  department_count integer;
  leaked_count integer;
begin
  select count(*) into demo_count from arandu_demo.facilities where active and is_test;
  if demo_count <> 3 then raise exception 'Expected 3 active demo facilities, found %', demo_count; end if;

  select count(distinct department) into department_count from arandu_demo.facilities;
  if department_count <> 3 then raise exception 'Expected 3 demo departments, found %', department_count; end if;

  select count(*) into leaked_count
  from elepem_core.facilities
  where facility_key in ('DEMO-ELEPEM-001', 'DEMO-ELEPEM-002', 'DEMO-ELEPEM-003');
  if leaked_count <> 0 then raise exception 'Demo identifiers leaked into elepem_core.facilities'; end if;

  select count(*) into leaked_count
  from public.residenciales
  where id in ('DEMO-ELEPEM-001', 'DEMO-ELEPEM-002', 'DEMO-ELEPEM-003');
  if leaked_count <> 0 then raise exception 'Demo identifiers leaked into public.residenciales'; end if;
end;
$$;

rollback;
