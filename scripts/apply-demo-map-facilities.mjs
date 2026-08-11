import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260810223000_add_demo_map_facilities.sql");

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

async function collectState(client) {
  const base = (await client.query(`
    select jsonb_build_object(
      'demo_table', to_regclass('arandu_demo.facilities') is not null,
      'public_registry', (select count(*) from public.arandu_facilities_registry),
      'public_msp', (select count(*) from public.arandu_facilities_registry where msp_final),
      'public_mides', (select count(*) from public.arandu_facilities_registry where mides_social),
      'legacy_total', (select count(*) from public.residenciales)
    ) as value
  `)).rows[0].value;
  if (!base.demo_table) return { ...base, demo_count: 0, demo_departments: [] };
  const demo = (await client.query(`
    select count(*)::integer as demo_count,
      array_agg(department order by department) as demo_departments
    from arandu_demo.facilities where active and is_test
  `)).rows[0];
  return { ...base, ...demo };
}

function assertCanonicalUnchanged(before, after) {
  for (const key of ["public_registry", "public_msp", "public_mides", "legacy_total"]) {
    if (Number(before[key]) !== Number(after[key])) {
      throw new Error(`La migración alteró ${key}: ${before[key]} -> ${after[key]}.`);
    }
  }
  if (Number(after.demo_count) !== 3) throw new Error(`Se esperaban 3 filas demo; hay ${after.demo_count}.`);
  const departments = [...(after.demo_departments || [])].sort().join("|");
  if (departments !== "Canelones|Montevideo|Paysandú") {
    throw new Error(`Departamentos demo inesperados: ${departments}.`);
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
    application_name: "arandu-demo-map-facilities-migration",
    connectionTimeoutMillis: 20_000,
  });

  const migrationSql = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex").toUpperCase();
  await client.connect();
  try {
    const before = await collectState(client);
    if (before.demo_table) throw new Error("arandu_demo.facilities ya existe; no se sobrescribirá automáticamente.");
    await client.query(migrationSql);
    const after = await collectState(client);
    assertCanonicalUnchanged(before, after);

    const leaked = await client.query(`
      select
        (select count(*) from elepem_core.facilities where facility_key like 'DEMO-ELEPEM-%') as core,
        (select count(*) from public.residenciales where id like 'DEMO-ELEPEM-%') as legacy
    `);
    if (Number(leaked.rows[0].core) || Number(leaked.rows[0].legacy)) {
      throw new Error(`Aislamiento demo fallido: ${JSON.stringify(leaked.rows[0])}.`);
    }

    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const reportPath = resolve(outputDirectory, `production_demo_map_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(reportPath, `${JSON.stringify({
      projectRef,
      appliedAt: new Date().toISOString(),
      migrationPath: MIGRATION_PATH,
      migrationSha256,
      before,
      after,
      canonicalTablesChanged: false,
      automaticPublication: false,
      demoOnly: true,
    }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ applied: true, projectRef, reportPath, after }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
