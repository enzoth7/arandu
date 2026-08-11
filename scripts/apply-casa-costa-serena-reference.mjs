import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260811190000_add_casa_costa_serena_reference.sql");
const TEST_PATH = resolve(PROJECT_ROOT, "supabase/tests/20260811190000_verify_casa_costa_serena_reference.sql");

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
    application_name: "arandu-casa-costa-serena-reference",
    connectionTimeoutMillis: 20_000,
  });
}

async function snapshot(client) {
  const summary = (await client.query(`
    select jsonb_build_object(
      'coreTotal', (select count(*) from elepem_core.facilities),
      'msp', (select count(*) from elepem_core.facilities where registry_msp_final),
      'mides', (select count(*) from elepem_core.facilities where registry_mides_social),
      'referenceCore', (select count(*) from elepem_core.facilities where facility_key = 'DEMO-ELEPEM-001'),
      'referencePublic', (select count(*) from public.arandu_facilities_registry where id = 'DEMO-ELEPEM-001'),
      'referenceIntake', (select count(*) from public.intake_reports where demo_facility_id = 'DEMO-ELEPEM-001'),
      'referenceLinkedIntake', (select count(*) from public.intake_reports where demo_facility_id = 'DEMO-ELEPEM-001' and facility_id is not null)
    ) as value
  `)).rows[0].value;
  const referenceRows = (await client.query(`
    select facility.id, facility.facility_key, facility.lifecycle_status,
      facility.review_status, facility.publication_status,
      facility.identity_status, facility.registry_visibility,
      facility.location_status, facility.registry_msp_final,
      facility.registry_mides_social, facility.created_at, facility.updated_at
    from elepem_core.facilities as facility
    where facility.facility_key = 'DEMO-ELEPEM-001'
  `)).rows;
  return { summary, referenceRows };
}

const args = parseArgs(process.argv.slice(2));
const projectRef = String(args["project-ref"] || process.env.SUPABASE_PROJECT_REF || "").trim();
const confirmation = String(args["confirm-project-ref"] || "").trim();
if (!projectRef) throw new Error("Falta --project-ref.");
if (confirmation !== projectRef) throw new Error("--confirm-project-ref debe coincidir exactamente con el proyecto.");

const [migrationSql, testSql] = await Promise.all([
  readFile(MIGRATION_PATH, "utf8"),
  readFile(TEST_PATH, "utf8"),
]);
const migrationHash = createHash("sha256").update(migrationSql).digest("hex").toUpperCase();
const client = databaseClient(projectRef);
await client.connect();

try {
  const before = await snapshot(client);
  if (Number(before.summary.msp) !== 212 || Number(before.summary.mides) !== 275) {
    throw new Error(`Invariantes previas inesperadas: MSP=${before.summary.msp}, MIDES=${before.summary.mides}.`);
  }

  const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
  await mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const date = uruguayDateStamp();
  const backupPath = resolve(outputDirectory, `pre_casa_costa_serena_${date}_${timestamp}.json`);
  await writeFile(backupPath, `${JSON.stringify({ projectRef, capturedAt: new Date().toISOString(), before }, null, 2)}\n`);

  await client.query(migrationSql);
  await client.query(testSql);
  const after = await snapshot(client);
  if (Number(after.summary.msp) !== 212 || Number(after.summary.mides) !== 275) {
    throw new Error("La migracion altero los invariantes MSP/MIDES.");
  }
  if (Number(after.summary.referenceCore) !== 1 || Number(after.summary.referencePublic) !== 1) {
    throw new Error("La referencia no quedo conectada al padron canonico y publico.");
  }

  const reportPath = resolve(outputDirectory, `production_casa_costa_serena_${date}_${timestamp}.json`);
  await writeFile(reportPath, `${JSON.stringify({
    projectRef,
    appliedAt: new Date().toISOString(),
    migration: MIGRATION_PATH,
    migrationSha256: migrationHash,
    backupPath,
    before: before.summary,
    after: after.summary,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ applied: true, backupPath, reportPath, before: before.summary, after: after.summary }, null, 2));
} finally {
  await client.end();
}
