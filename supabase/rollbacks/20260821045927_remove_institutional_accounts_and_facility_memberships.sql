-- Use only before real institutional accounts or requests exist.
-- The normal application rollback disables the new routes and preserves these
-- tables so that identity and decision history are not lost.

begin;

do $$
begin
  if exists (select 1 from public.institutional_accounts)
     or exists (select 1 from public.facility_memberships)
     or exists (select 1 from public.intake_reports where submitted_by_user_id is not null) then
    raise exception 'institutional data exists; preserve it and roll back only the application flow';
  end if;
end $$;

alter table public.intake_reports drop column if exists submitted_by_user_id;
drop table if exists public.facility_memberships;
drop table if exists public.institutional_accounts;

commit;
