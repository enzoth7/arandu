import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260810183000_unify_elepem_registry.sql");

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

async function collectState(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'legacy_total', (select count(*) from public.residenciales),
      'legacy_msp', (select count(*) from public.residenciales where msp_final),
      'legacy_mides', (select count(*) from public.residenciales where mides_social),
      'core_total', (select count(*) from elepem_core.facilities),
      'candidates', (select count(*) from discovery_private.facility_candidates),
      'unified_schema', exists (
        select 1 from information_schema.columns
        where table_schema = 'elepem_core' and table_name = 'facilities'
          and column_name = 'identity_status'
      ),
      'registry_view', to_regclass('public.arandu_facilities_registry') is not null,
      'source_view', to_regclass('public.arandu_facility_source_links') is not null,
      'queue_view', to_regclass('public.arandu_facilities_identity_queue') is not null
    ) as value
  `);
  return result.rows[0].value;
}

function assertBaseCounts(state) {
  const expected = {
    legacy_total: 801,
    legacy_msp: 212,
    legacy_mides: 275,
    core_total: 893,
    candidates: 226,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(state[key]) !== value) {
      throw new Error(`Esquema rechazado: ${key}=${state[key]}, esperado=${value}.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply !== true) throw new Error("Falta --apply.");
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }

  const backupPath = resolve(PROJECT_ROOT, required(args, "backup"));
  const expectedBackupHash = required(args, "backup-sha256").toUpperCase();
  const backupContent = await readFile(backupPath);
  const actualBackupHash = sha256(backupContent);
  if (actualBackupHash !== expectedBackupHash) throw new Error("El hash del respaldo no coincide.");
  const backup = JSON.parse(backupContent.toString("utf8"));
  if (backup.projectRef !== projectRef) throw new Error("El respaldo pertenece a otro proyecto.");
  assertBaseCounts(backup.before);

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-unified-schema-production-migration",
    connectionTimeoutMillis: 20_000,
  });

  await client.connect();
  try {
    const before = await collectState(client);
    assertBaseCounts(before);
    if (before.unified_schema || before.registry_view || before.source_view || before.queue_view) {
      throw new Error(`El esquema unificado ya existe o quedó parcial: ${JSON.stringify(before)}.`);
    }
    const migrationSql = await readFile(MIGRATION_PATH, "utf8");
    await client.query(migrationSql);
    const after = await collectState(client);
    assertBaseCounts(after);
    if (!after.unified_schema || !after.registry_view || !after.source_view || !after.queue_view) {
      throw new Error(`Verificación posterior incompleta: ${JSON.stringify(after)}.`);
    }

    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const reportPath = resolve(outputDirectory, `production_unified_schema_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(reportPath, `${JSON.stringify({
      projectRef,
      appliedAt: new Date().toISOString(),
      migrationPath: MIGRATION_PATH,
      backupPath,
      backupSha256: actualBackupHash,
      before,
      after,
      runtimeSwitched: false,
      automaticPublication: false,
    }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ applied: true, projectRef, reportPath, after, runtimeSwitched: false }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
