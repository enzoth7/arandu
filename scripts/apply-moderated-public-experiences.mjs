import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const INTAKE_V2_MIGRATION_PATH = resolve(
  PROJECT_ROOT,
  "supabase/migrations/20260810120000_add_demo_institutional_intake_v2.sql",
);
const MIGRATION_PATH = resolve(
  PROJECT_ROOT,
  "supabase/migrations/20260811120000_add_moderated_public_experiences.sql",
);

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function databaseClient(projectRef) {
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta SUPABASE_DB_PASSWORD.");
  return new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-moderated-public-experiences-migration",
    connectionTimeoutMillis: 20_000,
  });
}

async function collectObjects(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'core_facilities', to_regclass('elepem_core.facilities') is not null,
      'legacy_map', to_regclass('elepem_core.legacy_facility_map') is not null,
      'intake_reports', to_regclass('public.intake_reports') is not null,
      'intake_events', to_regclass('public.intake_report_events') is not null,
      'intake_attachments', to_regclass('public.intake_report_attachments') is not null,
      'intake_contacts', to_regclass('public.intake_report_contacts') is not null,
      'entry_type', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'entry_type'
      ),
      'payload_version', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'payload_version'
      ),
      'is_demo', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'is_demo'
      ),
      'demo_facility_id', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'demo_facility_id'
      ),
      'submitted_actor', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'submitted_actor'
      ),
      'attachment_purpose', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_report_attachments' and column_name = 'purpose'
      ),
      'attachment_rights', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_report_attachments' and column_name = 'rights_metadata'
      ),
      'facility_id', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intake_reports' and column_name = 'facility_id'
      ),
      'publication_table', to_regclass('elepem_core.facility_experience_publications') is not null,
      'publication_view', to_regclass('public.facility_experiences_published') is not null,
      'v3_constraint', exists (
        select 1 from pg_constraint
        where conrelid = to_regclass('public.intake_reports')
          and conname = 'intake_reports_experience_facility_v3_check'
      )
    ) as value
  `);
  return result.rows[0].value;
}

function assertPrerequisites(objects) {
  for (const key of [
    "core_facilities",
    "legacy_map",
    "intake_reports",
    "intake_events",
    "intake_attachments",
  ]) {
    if (!objects[key]) throw new Error(`Falta el prerrequisito de esquema: ${key}.`);
  }
}

function assertInstitutionalEnvelopeNotPartial(objects) {
  const keys = [
    "intake_contacts",
    "entry_type",
    "payload_version",
    "is_demo",
    "demo_facility_id",
    "submitted_actor",
    "attachment_purpose",
    "attachment_rights",
  ];
  const present = keys.filter((key) => objects[key]);
  if (present.length !== 0 && present.length !== keys.length) {
    throw new Error(`El sobre institucional v2 esta parcial: ${present.join(", ")}.`);
  }
}

function assertMigrationAbsent(objects) {
  const existing = ["facility_id", "publication_table", "publication_view", "v3_constraint"]
    .filter((key) => objects[key]);
  if (existing.length) {
    throw new Error(`La migracion ya existe o quedo parcial: ${existing.join(", ")}.`);
  }
}

async function collectCounts(client, objects) {
  const base = (await client.query(`
    select jsonb_build_object(
      'core_total', (select count(*) from elepem_core.facilities),
      'core_msp', (select count(*) from elepem_core.facilities where registry_msp_final),
      'core_mides', (select count(*) from elepem_core.facilities where registry_mides_social),
      'intake_total', (select count(*) from public.intake_reports),
      'events_total', (select count(*) from public.intake_report_events),
      'attachments_total', (select count(*) from public.intake_report_attachments)
    ) as value
  `)).rows[0].value;

  let experienceTotal = 0;
  let experienceDemo = 0;
  let contactsTotal = 0;
  if (objects.entry_type && objects.is_demo) {
    const experienceCounts = (await client.query(`
      select
        count(*) filter (where entry_type = 'experience')::integer as total,
        count(*) filter (where entry_type = 'experience' and is_demo)::integer as demo
      from public.intake_reports
    `)).rows[0];
    experienceTotal = Number(experienceCounts.total);
    experienceDemo = Number(experienceCounts.demo);
  }
  if (objects.intake_contacts) {
    contactsTotal = Number((await client.query(
      "select count(*)::integer as count from public.intake_report_contacts",
    )).rows[0].count);
  }

  const resolution = !objects.entry_type ? { resolvable: 0, unresolved: 0 } : (await client.query(`
    with experience_resolution as (
      select
        report.id,
        coalesce(canonical.id, legacy.facility_id) as resolved_facility_id
      from public.intake_reports as report
      left join lateral (
        select facility.id
        from elepem_core.facilities as facility
        where facility.facility_key = btrim(report.report_payload ->> 'facilityId')
        limit 1
      ) as canonical on true
      left join lateral (
        select mapping.facility_id
        from elepem_core.legacy_facility_map as mapping
        where mapping.legacy_residencial_id = btrim(report.report_payload ->> 'facilityId')
          and mapping.mapping_status = 'mapped'
        limit 1
      ) as legacy on canonical.id is null
      where report.entry_type = 'experience'
    )
    select
      count(*) filter (where resolved_facility_id is not null)::integer as resolvable,
      count(*) filter (where resolved_facility_id is null)::integer as unresolved
    from experience_resolution
  `)).rows[0];

  let linked = 0;
  if (objects.facility_id) {
    linked = Number((await client.query(`
      select count(*)::integer as count
      from public.intake_reports
      where entry_type = 'experience' and facility_id is not null
    `)).rows[0].count);
  }

  let publications = { total: 0, draft: 0, published: 0, withdrawn: 0 };
  if (objects.publication_table) {
    publications = (await client.query(`
      select
        count(*)::integer as total,
        count(*) filter (where status = 'draft')::integer as draft,
        count(*) filter (where status = 'published')::integer as published,
        count(*) filter (where status = 'withdrawn')::integer as withdrawn
      from elepem_core.facility_experience_publications
    `)).rows[0];
  }

  return {
    ...base,
    experience_total: experienceTotal,
    experience_demo: experienceDemo,
    contacts_total: contactsTotal,
    resolvable_experiences: Number(resolution.resolvable),
    unresolved_experiences: Number(resolution.unresolved),
    linked_experiences: linked,
    publications: Object.fromEntries(
      Object.entries(publications).map(([key, value]) => [key, Number(value)]),
    ),
  };
}

async function collectBackfillRows(client) {
  const objects = await collectObjects(client);
  if (!objects.entry_type) return [];
  const result = await client.query(`
    select
      report.id,
      report.case_code,
      report.payload_version,
      report.is_demo,
      report.current_status,
      report.created_at,
      nullif(btrim(report.report_payload ->> 'facilityId'), '') as submitted_facility_key,
      coalesce(canonical.id, legacy.facility_id) as resolved_facility_id,
      case
        when canonical.id is not null then 'canonical_key'
        when legacy.facility_id is not null then 'legacy_map'
        else 'unresolved'
      end as resolution_method
    from public.intake_reports as report
    left join lateral (
      select facility.id
      from elepem_core.facilities as facility
      where facility.facility_key = btrim(report.report_payload ->> 'facilityId')
      limit 1
    ) as canonical on true
    left join lateral (
      select mapping.facility_id
      from elepem_core.legacy_facility_map as mapping
      where mapping.legacy_residencial_id = btrim(report.report_payload ->> 'facilityId')
        and mapping.mapping_status = 'mapped'
      limit 1
    ) as legacy on canonical.id is null
    where report.entry_type = 'experience'
    order by report.created_at, report.id
  `);
  return result.rows;
}

function assertStableCounts(before, after) {
  for (const key of [
    "core_total",
    "core_msp",
    "core_mides",
    "intake_total",
    "experience_total",
    "experience_demo",
    "events_total",
    "attachments_total",
    "contacts_total",
    "resolvable_experiences",
    "unresolved_experiences",
  ]) {
    if (Number(before[key]) !== Number(after[key])) {
      throw new Error(`La migracion altero ${key}: ${before[key]} -> ${after[key]}.`);
    }
  }
  if (Number(after.linked_experiences) !== Number(before.resolvable_experiences)) {
    throw new Error(
      `Backfill incompleto: vinculadas=${after.linked_experiences}, resolubles=${before.resolvable_experiences}.`,
    );
  }
  if (Number(after.publications.total) !== 0) {
    throw new Error(`La migracion genero publicaciones automaticamente: ${after.publications.total}.`);
  }
}

function assertSnapshotStillCurrent(expected, current) {
  for (const key of [
    "core_total",
    "core_msp",
    "core_mides",
    "intake_total",
    "experience_total",
    "experience_demo",
    "events_total",
    "attachments_total",
    "contacts_total",
    "resolvable_experiences",
    "unresolved_experiences",
  ]) {
    if (Number(expected[key]) !== Number(current[key])) {
      throw new Error(`El estado cambio desde el respaldo: ${key}=${expected[key]} -> ${current[key]}.`);
    }
  }
}

async function verifySecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'forced_rls', (
        select relrowsecurity and relforcerowsecurity
        from pg_class
        where oid = 'elepem_core.facility_experience_publications'::regclass
      ),
      'anon_table_select', has_table_privilege(
        'anon', 'elepem_core.facility_experience_publications', 'select'
      ),
      'authenticated_table_select', has_table_privilege(
        'authenticated', 'elepem_core.facility_experience_publications', 'select'
      ),
      'anon_view_select', has_table_privilege(
        'anon', 'public.facility_experiences_published', 'select'
      ),
      'authenticated_view_select', has_table_privilege(
        'authenticated', 'public.facility_experiences_published', 'select'
      )
    ) as value
  `);
  const security = result.rows[0].value;
  if (
    !security.forced_rls
    || security.anon_table_select
    || security.authenticated_table_select
    || security.anon_view_select
    || security.authenticated_view_select
  ) {
    throw new Error(`Verificacion RLS fallida: ${JSON.stringify(security)}.`);
  }
  return security;
}

async function createBackup(client, projectRef, migrationSha256) {
  const objects = await collectObjects(client);
  assertPrerequisites(objects);
  assertInstitutionalEnvelopeNotPartial(objects);
  assertMigrationAbsent(objects);
  const before = await collectCounts(client, objects);
  const backfillRows = await collectBackfillRows(client);
  const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
  await mkdir(outputDirectory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupPath = resolve(
    outputDirectory,
    `pre_moderated_public_experiences_${uruguayDateStamp()}_${stamp}.json`,
  );
  const content = `${JSON.stringify({
    projectRef,
    capturedAt: new Date().toISOString(),
    migrationPaths: [INTAKE_V2_MIGRATION_PATH, MIGRATION_PATH],
    migrationSha256,
    objects,
    before,
    backfillRows,
    containsNarratives: false,
    containsContacts: false,
  }, null, 2)}\n`;
  await writeFile(backupPath, content, { flag: "wx" });
  return { backupPath, backupSha256: sha256(content), before, backfillRows };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }
  const intakeV2MigrationSql = await readFile(INTAKE_V2_MIGRATION_PATH, "utf8");
  const migrationSql = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = sha256(`${sha256(intakeV2MigrationSql)}:${sha256(migrationSql)}`);
  const client = databaseClient(projectRef);
  await client.connect();
  try {
    if (args["backup-only"] === true) {
      const backup = await createBackup(client, projectRef, migrationSha256);
      console.log(JSON.stringify({ projectRef, migrationSha256, ...backup }, null, 2));
      return;
    }
    if (args.apply !== true) throw new Error("Usa --backup-only o --apply.");

    const backupPath = resolve(PROJECT_ROOT, required(args, "backup"));
    const expectedBackupHash = required(args, "backup-sha256").toUpperCase();
    const backupContent = await readFile(backupPath);
    const actualBackupHash = sha256(backupContent);
    if (actualBackupHash !== expectedBackupHash) throw new Error("El hash del respaldo no coincide.");
    const backup = JSON.parse(backupContent.toString("utf8"));
    if (backup.projectRef !== projectRef) throw new Error("El respaldo pertenece a otro proyecto.");
    if (backup.migrationSha256 !== migrationSha256) throw new Error("La migracion cambio desde el respaldo.");

    const currentObjects = await collectObjects(client);
    assertPrerequisites(currentObjects);
    assertInstitutionalEnvelopeNotPartial(currentObjects);
    assertMigrationAbsent(currentObjects);
    const currentBefore = await collectCounts(client, currentObjects);
    assertSnapshotStillCurrent(backup.before, currentBefore);

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    try {
      await client.query(intakeV2MigrationSql);
      await client.query(migrationSql);
      const afterObjects = await collectObjects(client);
      const requiredAfter = [
        "intake_contacts",
        "entry_type",
        "payload_version",
        "is_demo",
        "demo_facility_id",
        "submitted_actor",
        "attachment_purpose",
        "attachment_rights",
        "facility_id",
        "publication_table",
        "publication_view",
        "v3_constraint",
      ];
      if (requiredAfter.some((key) => !afterObjects[key])) {
        throw new Error(`Esquema posterior incompleto: ${JSON.stringify(afterObjects)}.`);
      }
      const after = await collectCounts(client, afterObjects);
      assertStableCounts(backup.before, after);
      const security = await verifySecurity(client);
      await client.query("commit");

      const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
      await mkdir(outputDirectory, { recursive: true });
      const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
      const reportPath = resolve(
        outputDirectory,
        `production_moderated_public_experiences_${uruguayDateStamp()}_${stamp}.json`,
      );
      await writeFile(reportPath, `${JSON.stringify({
        projectRef,
        appliedAt: new Date().toISOString(),
        migrationPaths: [INTAKE_V2_MIGRATION_PATH, MIGRATION_PATH],
        migrationSha256,
        backupPath,
        backupSha256: actualBackupHash,
        before: backup.before,
        after,
        security,
        automaticPublication: false,
        canonicalFacilityRowsChanged: false,
      }, null, 2)}\n`, { flag: "wx" });
      console.log(JSON.stringify({ applied: true, projectRef, reportPath, before: backup.before, after, security }, null, 2));
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
