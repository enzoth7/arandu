import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260810225000_remove_demo_map_facility_rows.sql");
const RESERVED_IDS = ["DEMO-ELEPEM-001", "DEMO-ELEPEM-002", "DEMO-ELEPEM-003"];

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

async function collectCanonicalState(client) {
  return (await client.query(`
    select jsonb_build_object(
      'public_registry', (select count(*) from public.arandu_facilities_registry),
      'public_msp', (select count(*) from public.arandu_facilities_registry where msp_final),
      'public_mides', (select count(*) from public.arandu_facilities_registry where mides_social),
      'legacy_total', (select count(*) from public.residenciales)
    ) as value
  `)).rows[0].value;
}

async function collectDemoRows(client) {
  return (await client.query(`
    select * from arandu_demo.facilities
    where id = any($1::text[])
    order by id
  `, [RESERVED_IDS])).rows;
}

function assertCanonicalUnchanged(before, after) {
  for (const key of ["public_registry", "public_msp", "public_mides", "legacy_total"]) {
    if (Number(before[key]) !== Number(after[key])) {
      throw new Error(`La eliminación alteró ${key}: ${before[key]} -> ${after[key]}.`);
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

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-remove-demo-map-facilities",
    connectionTimeoutMillis: 20_000,
  });

  const migrationSql = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex").toUpperCase();
  await client.connect();
  try {
    const before = await collectCanonicalState(client);
    const backupRows = await collectDemoRows(client);
    if (backupRows.length !== 3 || backupRows.some((row, index) => row.id !== RESERVED_IDS[index] || row.is_test !== true)) {
      throw new Error(`Se esperaban exactamente las tres filas demo reservadas; se encontraron ${backupRows.length}.`);
    }

    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const backupPath = resolve(outputDirectory, `pre_remove_demo_map_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(backupPath, `${JSON.stringify({ projectRef, capturedAt: new Date().toISOString(), before, rows: backupRows }, null, 2)}\n`, { flag: "wx" });

    await client.query(migrationSql);
    const after = await collectCanonicalState(client);
    assertCanonicalUnchanged(before, after);
    const remainingRows = await collectDemoRows(client);
    if (remainingRows.length !== 0) throw new Error(`Persisten ${remainingRows.length} filas demo reservadas.`);

    const reportPath = resolve(outputDirectory, `production_remove_demo_map_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(reportPath, `${JSON.stringify({
      projectRef,
      appliedAt: new Date().toISOString(),
      migrationPath: MIGRATION_PATH,
      migrationSha256,
      backupPath,
      removedIds: RESERVED_IDS,
      before,
      after,
      remainingRows: 0,
      canonicalTablesChanged: false,
    }, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ applied: true, projectRef, backupPath, reportPath, removedIds: RESERVED_IDS, after }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
