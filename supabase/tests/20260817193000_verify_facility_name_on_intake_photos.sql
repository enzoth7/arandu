do $$
declare
  required_table text;
begin
  foreach required_table in array array['intake_report_attachments', 'facility_change_publication_photos'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = required_table
        and column_name = 'facility_name'
        and data_type = 'text'
    ) then
      raise exception '%.facility_name is missing or is not text', required_table;
    end if;
  end loop;

  if exists (
    select 1
    from public.intake_report_attachments as attachment
    join public.intake_reports as report on report.id = attachment.report_id
    where report.facility_id is not null
      and nullif(btrim(attachment.facility_name), '') is null
  ) then
    raise exception 'A facility-linked intake attachment has no facility_name';
  end if;

  if exists (
    select 1
    from public.facility_change_publication_photos
    where nullif(btrim(facility_name), '') is null
  ) then
    raise exception 'A published facility photo has no facility_name';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'intake_report_attachments_set_facility_name' and not tgisinternal) then
    raise exception 'The attachment facility_name trigger is missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'facility_change_publication_photos_set_facility_name' and not tgisinternal) then
    raise exception 'The published photo facility_name trigger is missing';
  end if;
end;
$$;
