import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { parseArgs, PROJECT_ROOT } from "./lib/discovery-files.mjs";

const { Client } = pg;
const MIGRATION_PATH = resolve(
  PROJECT_ROOT,
  "supabase/migrations/20260814180000_restore_casa_costa_serena_prototype_price.sql",
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
    application_name: "arandu-restore-casa-prototype-price",
    connectionTimeoutMillis: 20_000,
  });
}

async function audit(client) {
  const casa = (await client.query(`
    select id, monthly_price_from_uyu, price_as_of, price_includes, active, is_test
    from arandu_demo.facilities
    where id = 'DEMO-ELEPEM-001'
  `)).rows;
  const metrics = (await client.query(`
    select
      (select count(*)::integer
       from arandu_demo.facilities
       where monthly_price_from_uyu is not null) as isolated_prices,
      (select count(*)::integer
       from arandu_demo.facilities
       where id <> 'DEMO-ELEPEM-001' and monthly_price_from_uyu is not null) as other_isolated_prices,
      (select count(*)::integer
       from public.elepem
       where precio_es_demo or (precio_mensual_uyu is not null and precio_fuente_url is null)) as unsafe_real_prices
  `)).rows[0];
  return { casa, metrics };
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
      console.log(JSON.stringify({ projectRef, mode: "READ ONLY", ...before }, null, 2));
      return;
    }

    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const backupDirectory = resolve(PROJECT_ROOT, "data/maintenance");
    const backupPath = resolve(backupDirectory, `casa-costa-prototype-price-before-${stamp}.json`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, `${JSON.stringify({
      projectRef,
      capturedAt: new Date().toISOString(),
      reason: "Restore the single Casa Costa Serena prototype price for public UI validation",
      ...before,
    }, null, 2)}\n`, { flag: "wx" });

    await client.query(await readFile(MIGRATION_PATH, "utf8"));

    await client.query("begin transaction read only");
    const after = await audit(client);
    await client.query("rollback");
    const row = after.casa[0];
    if (
      after.casa.length !== 1
      || Number(row.monthly_price_from_uyu) !== 78_000
      || Number(after.metrics.isolated_prices) !== 1
      || Number(after.metrics.other_isolated_prices) !== 0
      || Number(after.metrics.unsafe_real_prices) !== 0
    ) {
      throw new Error(`La verificación posterior falló: ${JSON.stringify(after)}`);
    }
    console.log(JSON.stringify({ projectRef, applied: true, backupPath, before, after }, null, 2));
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
