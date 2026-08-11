import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260810233000_publish_all_mapped_candidates.sql");

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

async function collectState(client) {
  return (await client.query(`
    select jsonb_build_object(
      'legacy_total', (select count(*) from public.residenciales),
      'legacy_msp', (select count(*) from public.residenciales where msp_final),
      'legacy_mides', (select count(*) from public.residenciales where mides_social),
      'legacy_hash', (
        select md5(coalesce(jsonb_agg(to_jsonb(row) order by row.id), '[]'::jsonb)::text)
        from public.residenciales as row
      ),
      'registry_total', (select count(*) from public.arandu_facilities_registry),
      'registry_msp', (select count(*) from public.arandu_facilities_registry where msp_final),
      'registry_mides', (select count(*) from public.arandu_facilities_registry where mides_social),
      'registry_unconfirmed', (
        select count(*) from public.arandu_facilities_registry where not msp_final and not mides_social
      ),
      'mapped_candidates', (
        select count(*) from elepem_core.facilities
        where origin_candidate_id is not null and lifecycle_status = 'current' and location_status = 'mapped'
      ),
      'public_mapped_candidates', (
        select count(*) from elepem_core.facilities
        where origin_candidate_id is not null and lifecycle_status = 'current' and location_status = 'mapped'
          and identity_status = 'confirmed_facility' and registry_visibility = 'public'
      ),
      'held_mapped_candidates', (
        select count(*) from elepem_core.facilities
        where origin_candidate_id is not null and lifecycle_status = 'current' and location_status = 'mapped'
          and not (identity_status = 'confirmed_facility' and registry_visibility = 'public')
      ),
      'candidate_location_pending', (
        select count(*) from elepem_core.facilities
        where origin_candidate_id is not null and location_status = 'location_pending'
      ),
      'candidate_address_gaps', (
        select count(*) from elepem_core.facilities as facility
        where facility.origin_candidate_id is not null
          and facility.lifecycle_status = 'current'
          and facility.location_status = 'mapped'
          and not exists (
            select 1 from elepem_core.facility_addresses as address
            where address.facility_id = facility.id and address.is_current and address.address_type = 'physical'
          )
      ),
      'candidate_geocode_gaps', (
        select count(*) from elepem_core.facilities as facility
        where facility.origin_candidate_id is not null
          and facility.lifecycle_status = 'current'
          and facility.location_status = 'mapped'
          and not exists (
            select 1 from elepem_core.facility_geocodes as geocode
            where geocode.facility_id = facility.id and geocode.is_current
          )
      ),
      'hogar_emanuel_visible', exists (
        select 1
        from public.arandu_facilities_registry as registry
        join elepem_core.facilities as facility on facility.facility_key = registry.id
        join discovery_private.facility_candidates as candidate on candidate.id = facility.origin_candidate_id
        where candidate.candidate_key = 'instagram:paysandu:hogar-emanuel'
      )
    ) as value
  `)).rows[0].value;
}

function assertBefore(state) {
  const expected = {
    legacy_total: 801,
    legacy_msp: 212,
    legacy_mides: 275,
    registry_total: 910,
    registry_msp: 212,
    registry_mides: 275,
    registry_unconfirmed: 593,
    mapped_candidates: 145,
    public_mapped_candidates: 36,
    held_mapped_candidates: 109,
    candidate_location_pending: 83,
    candidate_address_gaps: 15,
    candidate_geocode_gaps: 15,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(state[key]) !== value) throw new Error(`Preflight rechazado: ${key}=${state[key]}, esperado=${value}.`);
  }
  if (state.hogar_emanuel_visible === true) throw new Error("Hogar Emanuel ya estaba visible; el estado base no coincide.");
}

function assertAfter(before, after) {
  const expected = {
    legacy_total: 801,
    legacy_msp: 212,
    legacy_mides: 275,
    registry_total: 1019,
    registry_msp: 212,
    registry_mides: 275,
    registry_unconfirmed: 702,
    mapped_candidates: 145,
    public_mapped_candidates: 145,
    held_mapped_candidates: 0,
    candidate_location_pending: 83,
    candidate_address_gaps: 0,
    candidate_geocode_gaps: 0,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(after[key]) !== value) throw new Error(`Verificacion fallida: ${key}=${after[key]}, esperado=${value}.`);
  }
  if (after.hogar_emanuel_visible !== true) throw new Error("Hogar Emanuel no quedo visible.");
  if (before.legacy_hash !== after.legacy_hash) throw new Error("public.residenciales cambio durante la migracion.");
}

async function collectBackup(client) {
  return (await client.query(`
    select jsonb_build_object(
      'candidate_facilities', (
        select coalesce(jsonb_agg(to_jsonb(facility) order by facility.id), '[]'::jsonb)
        from elepem_core.facilities as facility where facility.origin_candidate_id is not null
      ),
      'candidate_addresses', (
        select coalesce(jsonb_agg(to_jsonb(address) order by address.id), '[]'::jsonb)
        from elepem_core.facility_addresses as address
        join elepem_core.facilities as facility on facility.id = address.facility_id
        where facility.origin_candidate_id is not null
      ),
      'candidate_geocodes', (
        select coalesce(jsonb_agg(to_jsonb(geocode) order by geocode.id), '[]'::jsonb)
        from elepem_core.facility_geocodes as geocode
        join elepem_core.facilities as facility on facility.id = geocode.facility_id
        where facility.origin_candidate_id is not null
      )
    ) as value
  `)).rows[0].value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply !== true) throw new Error("Falta --apply.");
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-publish-all-mapped-candidates",
    connectionTimeoutMillis: 20_000,
  });

  const migrationSql = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex").toUpperCase();
  await client.connect();
  try {
    const before = await collectState(client);
    assertBefore(before);
    const backup = await collectBackup(client);
    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const backupPath = resolve(outputDirectory, `pre_publish_all_mapped_candidates_${uruguayDateStamp()}_${stamp}.json`);
    const reportPath = resolve(outputDirectory, `production_publish_all_mapped_candidates_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(backupPath, `${JSON.stringify({ projectRef, createdAt: new Date().toISOString(), before, backup }, null, 2)}\n`, { flag: "wx" });

    await client.query(migrationSql);
    const after = await collectState(client);
    assertAfter(before, after);
    await writeFile(reportPath, `${JSON.stringify({
      projectRef,
      appliedAt: new Date().toISOString(),
      migrationPath: MIGRATION_PATH,
      migrationSha256,
      backupPath,
      before,
      after,
      automaticPublication: false,
      operatorAuthorized: true,
      evidenceDeleted: false,
      legacyChanged: false,
    }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ applied: true, projectRef, backupPath, reportPath, after }, null, 2));
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { assertAfter, assertBefore, collectState };
