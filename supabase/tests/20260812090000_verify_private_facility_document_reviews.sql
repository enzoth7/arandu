do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'intake_reports_current_status_check') then
    raise exception 'Falta la restricción de estados de intake_reports';
  end if;
  if to_regclass('public.facility_document_status_reviews') is null then
    raise exception 'Falta la tabla privada de revisiones documentales';
  end if;
end;
$$;
