begin;

do $$
declare
  role_check text;
  relationship_check text;
  membership_check text;
begin
  select pg_get_constraintdef(oid) into role_check
  from pg_constraint where conname = 'institutional_accounts_role_check'
    and conrelid = 'public.institutional_accounts'::regclass;
  if role_check is null
     or role_check not like '%administrator%'
     or role_check not like '%verifier%'
     or role_check not like '%moderator%'
     or role_check not like '%support%'
     or role_check not like '%facility_representative%' then
    raise exception 'institutional role constraint is incomplete';
  end if;

  select pg_get_constraintdef(oid) into relationship_check
  from pg_constraint where conname = 'user_facility_relationships_status_check'
    and conrelid = 'public.user_facility_relationships'::regclass;
  if relationship_check is null
     or relationship_check not like '%pending%'
     or relationship_check not like '%verified%'
     or relationship_check not like '%expired%'
     or relationship_check not like '%disputed%'
     or relationship_check not like '%rejected%'
     or relationship_check not like '%revoked%' then
    raise exception 'personal relationship states are incomplete';
  end if;

  select pg_get_constraintdef(oid) into membership_check
  from pg_constraint where conname = 'facility_memberships_status_check'
    and conrelid = 'public.facility_memberships'::regclass;
  if membership_check is null or membership_check not like '%pending%' or membership_check not like '%rejected%' then
    raise exception 'representation request states are incomplete';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'user_facility_relationships' and column_name = 'assigned_verifier_id') then
    raise exception 'assigned verifier audit column is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'facility_memberships' and column_name = 'requested_at') then
    raise exception 'representation request date is missing';
  end if;

  if has_table_privilege('anon', 'public.institutional_accounts', 'select')
     or has_table_privilege('anon', 'public.facility_memberships', 'select')
     or has_table_privilege('anon', 'public.user_facility_relationships', 'select') then
    raise exception 'anon must not read private role or relationship data';
  end if;
  if has_table_privilege('authenticated', 'public.facility_memberships', 'insert')
     or has_table_privilege('authenticated', 'public.user_facility_relationships', 'insert') then
    raise exception 'authenticated users must request relationships through server APIs';
  end if;
end $$;

rollback;
