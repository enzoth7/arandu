import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = resolve(PROJECT_ROOT, ".local-backups", "elepem");

const TABLES = Object.freeze([
  "public.residenciales",
  "public.residencial_discovery_candidates",
  "public.elepem_sin_coordenadas_no_confirmadas",
  "discovery_private.facility_source_runs",
  "discovery_private.facility_source_observations",
  "discovery_private.facility_candidates",
  "discovery_private.facility_candidate_sources",
  "discovery_private.facility_candidate_match_suggestions",
  "discovery_private.facility_candidate_review_events",
  "discovery_private.facility_external_ids",
  "elepem_core.source_catalog",
  "elepem_core.organizations",
  "elepem_core.facilities",
  "elepem_core.facility_operators",
  "elepem_core.facility_names",
  "elepem_core.facility_addresses",
  "elepem_core.facility_contacts",
  "elepem_core.facility_social_accounts",
  "elepem_core.facility_observation_links",
  "elepem_core.facility_administrative_events",
  "elepem_core.facility_capacity_observations",
  "elepem_core.facility_geocodes",
  "elepem_core.facility_reviews",
  "elepem_core.facility_public_profiles",
  "elepem_core.legacy_facility_map",
]);

const REDACTED_COLUMNS = Object.freeze({
  "discovery_private.facility_source_runs": ["request_parameters"],
  "discovery_private.facility_source_observations": ["raw_metadata"],
  "discovery_private.facility_candidate_review_events": ["corrections", "candidate_before", "candidate_after"],
  "elepem_core.facilities": ["migration_payload"],
  "elepem_core.facility_geocodes": ["provider_response"],
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Argumento inesperado: ${value}`);
    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) args[rawKey] = inlineValue;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) args[rawKey] = argv[++index];
    else args[rawKey] = true;
  }
  return args;
}

function safeIdentifier(relation) {
  if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(relation)) {
    throw new Error(`RelaciÃ³n no permitida: ${relation}`);
  }
  return relation.split(".").map((part) => `"${part}"`).join(".");
}

function sanitizedRow(relation, row) {
  const copy = structuredClone(row);
  for (const column of REDACTED_COLUMNS[relation] || []) {
    if (Object.hasOwn(copy, column)) copy[column] = null;
  }
  return copy;
}

function assertSafeOutputDirectory(outputDirectory) {
  const baseInputs = resolve(PROJECT_ROOT, "Base de Datos");
  const candidate = resolve(outputDirectory);
  const withinBaseInputs = candidate === baseInputs || relative(baseInputs, candidate).split(/[\\/]/)[0] !== "..";
  if (withinBaseInputs) throw new Error("El respaldo nunca puede escribirse dentro de Base de Datos/.");
  return candidate;
}

function databaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectRef || !password) throw new Error("Falta la configuraciÃ³n de Supabase.");
  return {
    projectRef,
    connection: {
      host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_NAME || "postgres",
      user: process.env.SUPABASE_DB_USER || "postgres",
      password,
      ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
        ? false
        : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
      application_name: "arandu-flat-elepem-readonly-backup",
      connectionTimeoutMillis: 20_000,
    },
  };
}

async function readRelation(client, relation) {
  const rows = (await client.query(`select to_jsonb(source_row) as value from ${safeIdentifier(relation)} as source_row`))
    .rows.map((item) => item.value);
  rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), "en"));
  const rawPayload = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const sanitizedRows = rows.map((row) => sanitizedRow(relation, row));
  const exportPayload = `${JSON.stringify({
    relation,
    exportedAt: new Date().toISOString(),
    sensitiveRawFieldsRedacted: REDACTED_COLUMNS[relation] || [],
    rows: sanitizedRows,
  }, null, 2)}\n`;
  return {
    rowCount: rows.length,
    sourceSha256: sha256(rawPayload),
    exportSha256: sha256(exportPayload),
    exportPayload,
  };
}

async function backupFlatElepemCutover({ outputDirectory = DEFAULT_OUTPUT } = {}) {
  const outputRoot = assertSafeOutputDirectory(outputDirectory);
  const { projectRef, connection } = databaseConfig();
  const client = new pg.Client(connection);
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local statement_timeout = '60s'");
    await client.query("set local lock_timeout = '5s'");

    const forbiddenGoogleRows = await client.query(`
      select count(*)::integer as count
      from discovery_private.facility_source_observations
      where source_url ~* '^https?://(?:[^/]*\\.)?google\\.[^/]+/maps(?:/|$)'
         or source_url ~* '^https?://maps\\.app\\.goo\\.gl(?:/|$)'
    `);
    if (forbiddenGoogleRows.rows[0]?.count > 0) {
      throw new Error("El respaldo se detuvo: hay observaciones Google no permitidas para copiar.");
    }

    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const target = resolve(outputRoot, stamp);
    await mkdir(target, { recursive: true });

    const files = [];
    for (const relation of TABLES) {
      const snapshot = await readRelation(client, relation);
      const fileName = `${relation}.json`;
      await writeFile(resolve(target, fileName), snapshot.exportPayload, { flag: "wx" });
      files.push({
        relation,
        file: fileName,
        rowCount: snapshot.rowCount,
        sourceSha256: snapshot.sourceSha256,
        exportSha256: snapshot.exportSha256,
        redactedColumns: REDACTED_COLUMNS[relation] || [],
      });
    }

    const discardedRows = await client.query(`
      select
        facility.id,
        facility.facility_key as codigo,
        facility.lifecycle_status,
        preferred_name.name as nombre,
        current_address.department as departamento,
        current_address.locality as localidad,
        current_address.address_line as direccion,
        facility.created_at,
        facility.updated_at
      from elepem_core.facilities as facility
      left join lateral (
        select name.name from elepem_core.facility_names as name
        where name.facility_id = facility.id and name.is_preferred
        order by name.id desc limit 1
      ) as preferred_name on true
      left join lateral (
        select address.department, address.locality, address.address_line
        from elepem_core.facility_addresses as address
        where address.facility_id = facility.id and address.is_current
        order by address.id desc limit 1
      ) as current_address on true
      where facility.lifecycle_status in ('historical', 'merged')
      order by facility.id
    `);
    const discardedPayload = `${JSON.stringify({
      purpose: "historical-and-merged-rows-excluded-from-operational-tables",
      rows: discardedRows.rows,
    }, null, 2)}\n`;
    const discardedFile = "excluded-historical-and-merged.json";
    await writeFile(resolve(target, discardedFile), discardedPayload, { flag: "wx" });

    const manifest = {
      formatVersion: 1,
      projectRef,
      createdAt: new Date().toISOString(),
      transaction: "REPEATABLE READ, READ ONLY",
      prohibitedContentCopied: false,
      backendIntakeTablesIncluded: false,
      excludedHistoricalAndMerged: {
        file: discardedFile,
        rowCount: discardedRows.rows.length,
        sha256: sha256(discardedPayload),
      },
      files,
    };
    const manifestPayload = `${JSON.stringify(manifest, null, 2)}\n`;
    const manifestSha256 = sha256(manifestPayload);
    await writeFile(resolve(target, "manifest.json"), manifestPayload, { flag: "wx" });
    await writeFile(resolve(target, "manifest.sha256"), `${manifestSha256}  manifest.json\n`, { flag: "wx" });
    await client.query("rollback");
    return { outputDirectory: target, manifestSha256, files: files.length };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDirectory = args.output ? resolve(PROJECT_ROOT, String(args.output)) : DEFAULT_OUTPUT;
  const result = await backupFlatElepemCutover({ outputDirectory });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export {
  REDACTED_COLUMNS,
  TABLES,
  assertSafeOutputDirectory,
  backupFlatElepemCutover,
  parseArgs,
  sanitizedRow,
  sha256,
};
