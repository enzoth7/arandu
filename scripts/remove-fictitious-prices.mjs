import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(
  PROJECT_ROOT,
  "supabase/migrations/20260814170000_remove_fictitious_prices.sql",
);

function clientFor(projectRef) {
  if (!projectRef || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error("Falta la configuración de Supabase.");
  }
  return new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-remove-fictitious-prices",
    connectionTimeoutMillis: 20_000,
  });
}

async function audit(client) {
  async function rowsWhenPresent(tableName, sql) {
    const present = (await client.query("select to_regclass($1) is not null as present", [tableName])).rows[0].present;
    return present ? (await client.query(sql)).rows : [];
  }

  const publicRows = await rowsWhenPresent("public.elepem", `
      select id, codigo, precio_mensual_uyu, precio_fecha, precio_incluye,
        precio_fuente_url, precio_es_demo
      from public.elepem
      where precio_es_demo
      order by id
    `);
  const unlocatedRows = await rowsWhenPresent("public.elepem_sin_ubicacion", `
      select id, codigo, precio_mensual_uyu, precio_fecha, precio_incluye,
        precio_fuente_url, precio_es_demo
      from public.elepem_sin_ubicacion
      where precio_es_demo
      order by id
    `);
  const coreRows = await rowsWhenPresent("elepem_core.facilities", `
      select id, facility_key, demo_monthly_price_uyu
      from elepem_core.facilities
      where demo_monthly_price_uyu is not null
      order by id
    `);
  const profileRows = await rowsWhenPresent("elepem_core.facility_public_profiles", `
      select profile.facility_id, facility.facility_key,
        profile.monthly_price_from_uyu, profile.price_as_of, profile.price_includes
      from elepem_core.facility_public_profiles as profile
      join elepem_core.facilities as facility on facility.id = profile.facility_id
      where facility.is_demo and profile.monthly_price_from_uyu is not null
      order by profile.facility_id
    `);
  const demoRows = await rowsWhenPresent("arandu_demo.facilities", `
      select id, monthly_price_from_uyu, price_as_of, price_includes
      from arandu_demo.facilities
      where monthly_price_from_uyu is not null
      order by id
    `);
  const rows = {
    publicElepem: publicRows,
    unlocatedElepem: unlocatedRows,
    normalizedSource: coreRows,
    demoPublicProfiles: profileRows,
    isolatedDemoFacilities: demoRows,
  };
  return {
    counts: Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, value.length])),
    rows,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = args.apply === true;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (apply && String(args["acknowledge-project"] || "") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }

  const client = clientFor(projectRef);
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '60s'");
    const before = await audit(client);
    await client.query("rollback");

    if (!apply) {
      console.log(JSON.stringify({ projectRef, mode: "READ ONLY", counts: before.counts }, null, 2));
      return;
    }

    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const backupDirectory = resolve(PROJECT_ROOT, "data/maintenance");
    const backupPath = resolve(backupDirectory, `fictitious-prices-before-${stamp}.json`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, `${JSON.stringify({
      projectRef,
      capturedAt: new Date().toISOString(),
      reason: "Remove all values explicitly identified as synthetic or demo prices",
      ...before,
    }, null, 2)}\n`, { flag: "wx" });

    const migration = await readFile(MIGRATION_PATH, "utf8");
    await client.query(migration);

    await client.query("begin transaction read only");
    const after = await audit(client);
    await client.query("rollback");
    if (Object.values(after.counts).some((count) => count !== 0)) {
      throw new Error(`La verificación posterior no quedó en cero: ${JSON.stringify(after.counts)}`);
    }
    console.log(JSON.stringify({
      projectRef,
      applied: true,
      backupPath,
      before: before.counts,
      after: after.counts,
    }, null, 2));
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
