import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

function databaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || !process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta la configuraciÃ³n de Supabase.");
  return {
    projectRef,
    connection: {
      host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_NAME || "postgres",
      user: process.env.SUPABASE_DB_USER || "postgres",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: process.env.SUPABASE_DB_SSL_MODE === "disable" ? false : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
      application_name: "arandu-flat-elepem-readonly-verification",
      connectionTimeoutMillis: 20_000,
    },
  };
}

export function assertMetrics(metrics) {
  const expected = {
    total: 1019,
    msp: 212,
    mides: 275,
    both: 170,
    mides_only: 105,
    unconfirmed: 702,
    demo_prices: 0,
    canelones: 117,
    unlocated: 83,
    unlocated_canelones: 39,
    unlocated_without_address: 26,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (Number(metrics[key]) !== expectedValue) {
      throw new Error(`VerificaciÃ³n fallida: ${key}=${metrics[key]}, esperado=${expectedValue}.`);
    }
  }
}

async function verify() {
  const { projectRef, connection } = databaseConfig();
  const client = new pg.Client(connection);
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout='30s'");
    const relation = await client.query("select to_regclass('public.elepem')::text as name");
    if (!relation.rows[0]?.name) throw new Error("La migraciÃ³n plana todavÃ­a no estÃ¡ aplicada.");
    const metrics = (await client.query(`
      select
        count(*)::integer as total,
        count(*) filter (where msp_habilitado)::integer as msp,
        count(*) filter (where mides_certificado)::integer as mides,
        count(*) filter (where msp_habilitado and mides_certificado)::integer as both,
        count(*) filter (where not msp_habilitado and mides_certificado)::integer as mides_only,
        count(*) filter (where not msp_habilitado and not mides_certificado)::integer as unconfirmed,
        count(*) filter (where precio_es_demo)::integer as demo_prices,
        count(*) filter (where departamento = 'Canelones')::integer as canelones,
        (select count(*)::integer from public.elepem_sin_ubicacion) as unlocated,
        (select count(*)::integer from public.elepem_sin_ubicacion where departamento = 'Canelones') as unlocated_canelones,
        (select count(*)::integer from public.elepem_sin_ubicacion where direccion is null) as unlocated_without_address
      from public.elepem
    `)).rows[0];
    assertMetrics(metrics);
    const integrity = (await client.query(`
      select
        count(*) filter (where cardinality(fuentes_referencias) <> cardinality(fuentes_urls))::integer as source_misalignment,
        count(*) filter (where precio_mensual_uyu is not null and not precio_es_demo and precio_fuente_url is null)::integer as real_price_without_source,
        count(*) filter (where codigo like 'DEMO-%')::integer as demos_in_registry,
        (select count(*)::integer from pg_constraint where contype = 'f' and (
          conrelid = 'public.elepem_sin_ubicacion'::regclass
          or confrelid = 'public.elepem_sin_ubicacion'::regclass
        )) as isolated_foreign_keys
      from public.elepem
    `)).rows[0];
    if (Object.values(integrity).some((value) => Number(value) !== 0)) {
      throw new Error(`Integridad fallida: ${JSON.stringify(integrity)}`);
    }
    await client.query("rollback");
    return { projectRef, transaction: "READ ONLY", metrics, integrity };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verify().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { verify };
