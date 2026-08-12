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
end;
$$;
