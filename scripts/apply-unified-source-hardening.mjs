import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260810214500_harden_unified_source_urls.sql");

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
      'registry_total', (select count(*) from public.arandu_facilities_registry),
      'registry_msp', (select count(*) from public.arandu_facilities_registry where msp_final),
      'registry_mides', (select count(*) from public.arandu_facilities_registry where mides_social),
      'internal_source_urls', (select count(*) from public.arandu_facility_source_links where source_url ilike '%supabase.co%'),
      'internal_primary_urls', (select count(*) from elepem_core.facilities where primary_source_url ilike '%supabase.co%')
    ) as value
  `)).rows[0].value;
}

function assertStableCounts(state) {
  const expected = { legacy_total: 801, legacy_msp: 212, legacy_mides: 275, registry_total: 910, registry_msp: 212, registry_mides: 275 };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(state[key]) !== value) throw new Error(`Hardening rechazado: ${key}=${state[key]}, esperado=${value}.`);
  }
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
    application_name: "arandu-unified-source-hardening",
    connectionTimeoutMillis: 20_000,
  });
  await client.connect();
  try {
    const before = await collectState(client);
    assertStableCounts(before);
    const migrationSql = await readFile(MIGRATION_PATH, "utf8");
    await client.query(migrationSql);
    const after = await collectState(client);
    assertStableCounts(after);
    if (Number(after.internal_source_urls) !== 0 || Number(after.internal_primary_urls) !== 0) {
      throw new Error(`El hardening no retiró todas las URLs internas: ${JSON.stringify(after)}.`);
    }
    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const reportPath = resolve(outputDirectory, `production_unified_source_hardening_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(reportPath, `${JSON.stringify({ projectRef, appliedAt: new Date().toISOString(), before, after,
      sourceObservationsDeleted: 0, runtimeSwitched: false, automaticPublication: false }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ applied: true, reportPath, before, after }, null, 2));
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
