import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const MIGRATION_PATH = resolve(ROOT, "supabase/migrations/20260817193000_add_facility_name_to_intake_photos.sql");
const TEST_PATH = resolve(ROOT, "supabase/tests/20260817193000_verify_facility_name_on_intake_photos.sql");
const apply = process.argv.includes("--apply");
const projectRef = process.env.SUPABASE_PROJECT_REF || "";

if (!projectRef || !process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta la configuración de Supabase.");
if (apply && !process.argv.includes(`--confirm-project-ref=${projectRef}`)) throw new Error("La aplicación requiere confirmar el proyecto de Supabase.");

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: process.env.SUPABASE_DB_SSL_MODE === "disable" ? false : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
  application_name: "arandu-facility-photo-name-migration",
  connectionTimeoutMillis: 20_000,
});

async function snapshot() {
  const columns = await client.query(`select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public' and table_name in ('intake_report_attachments', 'facility_change_publication_photos')
      order by table_name, ordinal_position`);
  const attachments = await client.query(`select attachment.id, attachment.report_id, report.facility_id, facility.nombre as expected_facility_name
      from public.intake_report_attachments attachment
      join public.intake_reports report on report.id = attachment.report_id
      left join public.elepem facility on facility.id = report.facility_id
      order by attachment.id`);
  const photos = await client.query(`select photo.id, photo.publication_id, publication.facility_id, facility.nombre as expected_facility_name
      from public.facility_change_publication_photos photo
      join public.facility_change_publications publication on publication.id = photo.publication_id
      left join public.elepem facility on facility.id = publication.facility_id
      order by photo.id`);
  return { columns: columns.rows, attachments: attachments.rows, photos: photos.rows };
}

const [migrationSql, testSql] = await Promise.all([readFile(MIGRATION_PATH, "utf8"), readFile(TEST_PATH, "utf8")]);
const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex");
await client.connect();
try {
  const before = await snapshot();
  const alreadyPresent = before.columns.some((column) => column.column_name === "facility_name");
  const summary = { attachments: before.attachments.length, photos: before.photos.length, namedAttachments: before.attachments.filter((row) => row.expected_facility_name).length, namedPhotos: before.photos.filter((row) => row.expected_facility_name).length };
  if (alreadyPresent) throw new Error("facility_name ya existe; no se aplicó ninguna modificación.");
  if (summary.attachments !== summary.namedAttachments || summary.photos !== summary.namedPhotos) throw new Error("Hay fotos existentes sin un ELEPEM canónico para completar.");

  const outputDirectory = resolve(ROOT, "data/migration");
  await mkdir(outputDirectory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupPath = resolve(outputDirectory, `facility_photo_name_before_${stamp}.json`);
  await writeFile(backupPath, `${JSON.stringify({ projectRef, capturedAt: new Date().toISOString(), migrationSha256, before }, null, 2)}\n`);
  if (!apply) {
    console.log(JSON.stringify({ dryRun: true, projectRef, migration: MIGRATION_PATH, migrationSha256, summary, backupPath }, null, 2));
    process.exit(0);
  }

  await client.query(migrationSql);
  await client.query(testSql);
  const after = await snapshot();
  const attachmentNames = await client.query("select count(*)::int as count from public.intake_report_attachments where nullif(btrim(facility_name), '') is not null");
  const photoNames = await client.query("select count(*)::int as count from public.facility_change_publication_photos where nullif(btrim(facility_name), '') is not null");
  if (Number(attachmentNames.rows[0].count) !== summary.attachments || Number(photoNames.rows[0].count) !== summary.photos) throw new Error("La verificación posterior de nombres no coincide.");

  const reportPath = resolve(outputDirectory, `facility_photo_name_result_${stamp}.json`);
  const result = { applied: true, projectRef, migration: MIGRATION_PATH, migrationSha256, backupPath, before: summary, after: { attachmentNames: attachmentNames.rows[0].count, photoNames: photoNames.rows[0].count }, columnsAfter: after.columns.filter((column) => column.column_name === "facility_name") };
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ...result, reportPath }, null, 2));
} finally {
  await client.end();
}
