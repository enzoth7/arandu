begin;

do $$
begin
  if to_regclass('public.facility_visits') is null then
    raise exception 'public.facility_visits is missing';
  end if;
  if not exists (
    select 1 from pg_class where oid = 'public.facility_visits'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'facility_visits must force RLS';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'facility_visits') <> 1 then
    raise exception 'facility_visits must use one combined read policy';
  end if;
  if has_table_privilege('anon', 'public.facility_visits', 'SELECT')
    or has_table_privilege('authenticated', 'public.facility_visits', 'INSERT')
    or has_table_privilege('authenticated', 'public.facility_visits', 'UPDATE')
    or has_table_privilege('authenticated', 'public.facility_visits', 'DELETE') then
    raise exception 'facility_visits direct privileges are too broad';
  end if;
  if not has_table_privilege('authenticated', 'public.facility_visits', 'SELECT') then
    raise exception 'authenticated users require RLS-protected SELECT';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'facility_experiences_published'
      and column_name = 'experience_kind'
  ) then
    raise exception 'public experience projection must expose its safe public kind';
  end if;
end $$;

rollback;
