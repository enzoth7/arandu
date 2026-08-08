import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const sourceUrl = new URL("../data/reference/facilities-seed.json", import.meta.url);
const records = JSON.parse(await readFile(sourceUrl, "utf8"));

if (!Array.isArray(records) || records.length === 0) {
  throw new Error("No se encontraron residenciales para importar.");
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!projectRef || !password) {
  throw new Error("Faltan SUPABASE_PROJECT_REF o SUPABASE_DB_PASSWORD.");
}

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password,
  ssl: {
    rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
  },
  max: 2,
  connectionTimeoutMillis: 15_000,
});

const upsertSql = `
  insert into public.residenciales (
    id,
    name,
    department,
    locality,
    address,
    places,
    lat,
    lng,
    precision,
    precision_label,
    status_group,
    status_stage,
    status_short,
    source_label
  )
  values (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13, $14
  )
  on conflict (id) do update set
    name = excluded.name,
    department = excluded.department,
    locality = excluded.locality,
    address = excluded.address,
    places = excluded.places,
    lat = excluded.lat,
    lng = excluded.lng,
    precision = excluded.precision,
    precision_label = excluded.precision_label,
    status_group = excluded.status_group,
    status_stage = excluded.status_stage,
    status_short = excluded.status_short,
    source_label = excluded.source_label,
    updated_at = now()
`;

const client = await pool.connect();

try {
  await client.query("begin");

  for (const record of records) {
    await client.query(upsertSql, [
      record.id,
      record.name,
      record.department,
      record.locality,
      record.address,
      record.places,
      record.lat,
      record.lng,
      record.precision,
      record.precisionLabel,
      record.statusGroup,
      record.statusStage,
      record.statusShort,
      record.sourceLabel,
    ]);
  }

  const verification = await client.query(
    "select count(*)::integer as count from public.residenciales where id = any($1::text[])",
    [records.map((record) => record.id)],
  );

  if (verification.rows[0]?.count !== records.length) {
    throw new Error(`La verificación encontró ${verification.rows[0]?.count ?? 0} de ${records.length} filas.`);
  }

  await client.query("commit");
  console.log(`Residenciales importados y verificados: ${records.length}.`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
