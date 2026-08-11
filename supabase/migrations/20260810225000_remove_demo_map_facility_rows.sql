-- Remove only the three fictitious map rows. The isolated table remains
-- available and empty for future controlled tests.

begin;

delete from arandu_demo.facilities
where is_test
  and id in ('DEMO-ELEPEM-001', 'DEMO-ELEPEM-002', 'DEMO-ELEPEM-003');

do $$
begin
  if exists (
    select 1 from arandu_demo.facilities
    where id in ('DEMO-ELEPEM-001', 'DEMO-ELEPEM-002', 'DEMO-ELEPEM-003')
  ) then
    raise exception 'The reserved demo rows were not fully removed';
  end if;
end;
$$;

commit;
