do $$
begin
  if to_regclass('public.facility_change_publications') is null then
    raise exception 'facility_change_publications is missing';
  end if;
  if to_regclass('public.facility_change_publication_photos') is null then
    raise exception 'facility_change_publication_photos is missing';
  end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.facility_change_publications'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'facility_change_publications must force RLS';
  end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.facility_change_publication_photos'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'facility_change_publication_photos must force RLS';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_change_publications'
      and column_name = 'publication_batch_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception 'facility_change_publications.publication_batch_id must be a required uuid';
  end if;
end;
$$;
