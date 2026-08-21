begin;

do $$
begin
  if to_regclass('public.user_facility_relationships') is null then
    raise exception 'user_facility_relationships is missing';
  end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.user_facility_relationships'::regclass) then
    raise exception 'RLS must be enabled and forced';
  end if;
  if has_table_privilege('anon', 'public.user_facility_relationships', 'select') then
    raise exception 'anon must not read private relationships';
  end if;
  if has_table_privilege('authenticated', 'public.user_facility_relationships', 'insert')
     or has_table_privilege('authenticated', 'public.user_facility_relationships', 'update')
     or has_table_privilege('authenticated', 'public.user_facility_relationships', 'delete') then
    raise exception 'authenticated users must not manage relationships';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_facility_relationships'
      and policyname = 'user_facility_relationships_read_own'
  ) then
    raise exception 'own relationship read policy is missing';
  end if;
end $$;

rollback;
