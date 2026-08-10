-- Run only against a disposable local/test database after the migration.
begin;

do $$
declare
  inserted_report_id uuid;
  event_id uuid;
  canonical_before bigint;
  canonical_after bigint;
  mutation_blocked boolean := false;
begin
  select count(*) into canonical_before from public.residenciales;

  insert into public.intake_reports (
    case_code, source, priority, department, report_payload,
    entry_type, is_demo, demo_facility_id, payload_version, submitted_actor
  ) values (
    'AM-20990101-A1B2C3D4', 'web', 'Baja', 'Montevideo',
    '{"version":2,"publication":"never_automatic"}'::jsonb,
    'experience', true, 'DEMO-ELEPEM-001', 2, 'public'
  ) returning id into inserted_report_id;

  insert into public.intake_report_contacts (report_id, name, email)
  values (inserted_report_id, 'Persona demo', 'persona@demo.invalid');

  select id into event_id from public.intake_report_events
  where intake_report_events.report_id = inserted_report_id order by created_at limit 1;

  begin
    update public.intake_report_events set public_title = 'Mutación no permitida' where id = event_id;
  exception when others then
    mutation_blocked := true;
  end;
  if not mutation_blocked then raise exception 'Intake events are not append-only'; end if;

  if exists (
    select 1 from public.intake_reports
    where id = inserted_report_id
      and (entry_type <> 'experience' or not is_demo or payload_version <> 2)
  ) then raise exception 'Demo envelope defaults or values are invalid'; end if;

  if has_table_privilege('anon', 'public.intake_report_contacts', 'select')
    or has_table_privilege('authenticated', 'public.intake_report_contacts', 'select')
  then raise exception 'Browser roles can read separated contacts'; end if;

  select count(*) into canonical_after from public.residenciales;
  if canonical_after <> canonical_before then raise exception 'Canonical registry changed'; end if;
end;
$$;

rollback;
