-- Run only against a disposable local/test database after the migration.
begin;

do $$
declare
  fixture_facility_id bigint;
  second_facility_id bigint;
  fixture_facility_key text;
  fixture_report_id uuid;
  fixture_publication_id uuid;
  publication_count integer;
  missing_facility_blocked boolean := false;
  invalid_body_blocked boolean := false;
  invalid_state_blocked boolean := false;
  mismatched_facility_blocked boolean := false;
begin
  select facility.id, facility.facility_key
  into fixture_facility_id, fixture_facility_key
  from elepem_core.facilities as facility
  order by facility.id
  limit 1;

  select facility.id
  into second_facility_id
  from elepem_core.facilities as facility
  where facility.id <> fixture_facility_id
  order by facility.id
  limit 1;

  if fixture_facility_id is null or second_facility_id is null then
    raise exception 'The SQL test requires at least two canonical facilities';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'intake_reports'
      and column_name = 'facility_id'
      and data_type = 'bigint'
      and is_nullable = 'YES'
  ) then
    raise exception 'intake_reports.facility_id is missing or has the wrong type/nullability';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intake_reports'::regclass
      and conname = 'intake_reports_facility_id_fkey'
      and contype = 'f'
  ) then
    raise exception 'intake_reports.facility_id foreign key is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intake_reports'::regclass
      and conname = 'intake_reports_experience_facility_v3_check'
      and contype = 'c'
      and convalidated
  ) then
    raise exception 'Experience payload v3 facility constraint is missing or unvalidated';
  end if;

  if exists (
    select 1
    from public.intake_reports as report
    where report.entry_type = 'experience'
      and report.facility_id is null
      and nullif(btrim(report.report_payload ->> 'facilityId'), '') is not null
      and (
        exists (
          select 1
          from elepem_core.facilities as facility
          where facility.facility_key = btrim(report.report_payload ->> 'facilityId')
        )
        or exists (
          select 1
          from elepem_core.legacy_facility_map as mapping
          where mapping.legacy_residencial_id = btrim(report.report_payload ->> 'facilityId')
            and mapping.mapping_status = 'mapped'
        )
      )
  ) then
    raise exception 'Resolvable experience rows were not backfilled';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'elepem_core.facility_experience_publications'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception 'Publication table is not protected by forced RLS';
  end if;

  if has_table_privilege('anon', 'elepem_core.facility_experience_publications', 'select')
    or has_table_privilege('authenticated', 'elepem_core.facility_experience_publications', 'select')
    or has_table_privilege('anon', 'public.facility_experiences_published', 'select')
    or has_table_privilege('authenticated', 'public.facility_experiences_published', 'select')
  then
    raise exception 'Browser roles can read private publications or the server-side view directly';
  end if;

  if not has_table_privilege('service_role', 'elepem_core.facility_experience_publications', 'select')
    or not has_table_privilege('service_role', 'elepem_core.facility_experience_publications', 'insert')
    or not has_table_privilege('service_role', 'elepem_core.facility_experience_publications', 'update')
    or not has_table_privilege('service_role', 'public.facility_experiences_published', 'select')
    or not has_column_privilege('service_role', 'elepem_core.facilities', 'facility_key', 'select')
    or not has_column_privilege('service_role', 'public.intake_reports', 'is_demo', 'select')
    or not has_column_privilege('service_role', 'public.intake_reports', 'entry_type', 'select')
    or not has_column_privilege('service_role', 'public.intake_reports', 'facility_id', 'select')
  then
    raise exception 'Server role lacks the minimal publication privileges';
  end if;

  begin
    insert into public.intake_reports (
      case_code, source, priority, department, report_payload,
      entry_type, is_demo, payload_version, submitted_actor
    ) values (
      'AM-20991231-E3000001', 'web', 'Baja', 'Montevideo',
      jsonb_build_object('version', 3, 'facilityId', fixture_facility_key),
      'experience', true, 3, 'public'
    );
  exception when check_violation then
    missing_facility_blocked := true;
  end;
  if not missing_facility_blocked then
    raise exception 'Experience payload v3 accepted without canonical facility_id';
  end if;

  insert into public.intake_reports (
    case_code, source, priority, department, report_payload,
    entry_type, is_demo, payload_version, submitted_actor, facility_id
  ) values (
    'AM-20991231-E3000002', 'web', 'Baja', 'Montevideo',
    jsonb_build_object(
      'version', 3,
      'facilityId', fixture_facility_key,
      'publicationConsent', true
    ),
    'experience', true, 3, 'public', fixture_facility_id
  ) returning id into fixture_report_id;

  select count(*) into publication_count
  from elepem_core.facility_experience_publications
  where report_id = fixture_report_id;
  if publication_count <> 0 then
    raise exception 'An intake report created a publication automatically';
  end if;

  begin
    insert into elepem_core.facility_experience_publications (
      report_id, facility_id, public_body, reviewer_identifier
    ) values (
      fixture_report_id, fixture_facility_id, 'Corto', 'state:test'
    );
  exception when check_violation then
    invalid_body_blocked := true;
  end;
  if not invalid_body_blocked then
    raise exception 'Publication accepted a body shorter than ten characters';
  end if;

  begin
    insert into elepem_core.facility_experience_publications (
      report_id, facility_id, public_body, reviewer_identifier
    ) values (
      fixture_report_id, second_facility_id,
      'Una versión pública moderada y anonimizada.', 'state:test'
    );
  exception when check_violation then
    mismatched_facility_blocked := true;
  end;
  if not mismatched_facility_blocked then
    raise exception 'Publication accepted a facility different from its intake report';
  end if;

  insert into elepem_core.facility_experience_publications (
    report_id,
    facility_id,
    public_body,
    public_relationship,
    public_period,
    reviewer_identifier
  ) values (
    fixture_report_id,
    fixture_facility_id,
    'La atención fue amable y las rutinas se explicaron con claridad.',
    'Familiar o referente',
    '2026',
    'state:test'
  ) returning id into fixture_publication_id;

  if exists (
    select 1 from public.facility_experiences_published
    where publication_id = fixture_publication_id
  ) then
    raise exception 'Draft publication leaked into the safe public view';
  end if;

  begin
    update elepem_core.facility_experience_publications
    set status = 'published'
    where id = fixture_publication_id;
  exception when check_violation then
    invalid_state_blocked := true;
  end;
  if not invalid_state_blocked then
    raise exception 'Published state accepted without published_at';
  end if;

  update elepem_core.facility_experience_publications
  set status = 'published', published_at = now()
  where id = fixture_publication_id;

  select count(*) into publication_count
  from public.facility_experiences_published
  where publication_id = fixture_publication_id
    and facility_key = fixture_facility_key
    and is_demo = true;
  if publication_count <> 1 then
    raise exception 'Explicit publication is missing from the safe public view';
  end if;

  update elepem_core.facility_experience_publications
  set
    status = 'withdrawn',
    withdrawn_at = now(),
    withdrawal_reason = 'Retiro solicitado durante la prueba local'
  where id = fixture_publication_id;

  if exists (
    select 1 from public.facility_experiences_published
    where publication_id = fixture_publication_id
  ) then
    raise exception 'Withdrawn publication remains visible in the safe public view';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_experiences_published'
      and column_name in (
        'report_id', 'facility_id', 'reviewer_identifier',
        'withdrawal_reason', 'contact', 'report_payload'
      )
  ) then
    raise exception 'The safe public view exposes an internal or identifying field';
  end if;
end;
$$;

rollback;
