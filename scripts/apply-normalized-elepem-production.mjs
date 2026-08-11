import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { applyNormalizedBackfill, collectNormalizedReconciliation } from "./lib/apply-normalized-elepem-backfill.mjs";
import { buildBackfillPlan, parseCsv } from "./lib/normalized-elepem-backfill.mjs";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;

const FORWARD_PATH = resolve(PROJECT_ROOT, "supabase/migrations/20260803042525_normalized_elepem_core_model.sql");
const SQL_TEST_PATH = resolve(PROJECT_ROOT, "supabase/tests/20260803042525_verify_normalized_elepem_core_model.sql");

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

async function readInput(pathValue, format = "json") {
  const path = resolve(PROJECT_ROOT, pathValue);
  const content = await readFile(path, "utf8");
  return {
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
    value: format === "csv" ? parseCsv(content) : JSON.parse(content),
  };
}

function snapshotDataHash(snapshot) {
  const payload = Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== "metadata"));
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function migrationBody(sql) {
  const beginIndex = sql.indexOf("\nbegin;");
  const commitIndex = sql.lastIndexOf("\ncommit;");
  if (beginIndex < 0 || commitIndex <= beginIndex) {
    throw new Error("No se encontraron los límites transaccionales esperados en la migración.");
  }
  return sql.slice(beginIndex + "\nbegin;".length, commitIndex);
}

async function collectPreflight(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'normalized_present', to_regclass('elepem_core.facilities') is not null,
      'residenciales', (select count(*) from public.residenciales),
      'source_runs', (select count(*) from discovery_private.facility_source_runs),
      'source_observations', (select count(*) from discovery_private.facility_source_observations),
      'candidates', (select count(*) from discovery_private.facility_candidates),
      'candidate_sources', (select count(*) from discovery_private.facility_candidate_sources),
      'external_ids', (select count(*) from discovery_private.facility_external_ids),
      'match_suggestions', (select count(*) from discovery_private.facility_candidate_match_suggestions),
      'review_events', (select count(*) from discovery_private.facility_candidate_review_events),
      'demo_rows', (select count(*) from public.residenciales where id = any(array['VER-DEMO-001','VER-DEMO-002','VER-DEMO-003'])),
      'google_maps_app_rows', (select count(*) from public.residenciales where status_group = 'app' and source_label like 'SerpApi Google Maps%')
    ) as value
  `);
  return result.rows[0].value;
}

async function collectSchemaBackup(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'captured_at', now(),
      'tables', coalesce((select jsonb_agg(to_jsonb(item) order by item.table_schema, item.table_name)
        from (select table_schema, table_name, table_type from information_schema.tables
          where table_schema in ('public', 'discovery_private')) item), '[]'::jsonb),
      'views', coalesce((select jsonb_agg(to_jsonb(item) order by item.schemaname, item.viewname)
        from (select schemaname, viewname, definition from pg_views
          where schemaname in ('public', 'discovery_private')) item), '[]'::jsonb),
      'policies', coalesce((select jsonb_agg(to_jsonb(item) order by item.schemaname, item.tablename, item.policyname)
        from (select * from pg_policies where schemaname in ('public', 'discovery_private')) item), '[]'::jsonb),
      'grants', coalesce((select jsonb_agg(to_jsonb(item) order by item.table_schema, item.table_name, item.grantee, item.privilege_type)
        from (select table_schema, table_name, grantee, privilege_type from information_schema.role_table_grants
          where table_schema in ('public', 'discovery_private')) item), '[]'::jsonb),
      'functions', coalesce((select jsonb_agg(to_jsonb(item) order by item.schema_name, item.function_name)
        from (select namespace.nspname as schema_name, procedure.proname as function_name,
          pg_get_functiondef(procedure.oid) as definition
          from pg_proc procedure join pg_namespace namespace on namespace.oid = procedure.pronamespace
          where namespace.nspname in ('public', 'discovery_private')) item), '[]'::jsonb)
    ) as value
  `);
  return result.rows[0].value;
}

function assertCounts(preflight, snapshot) {
  const expected = snapshot.metadata.counts;
  const pairs = [
    ["residenciales", "residenciales"], ["source_runs", "sourceRuns"],
    ["source_observations", "sourceObservations"], ["candidates", "candidates"],
    ["candidate_sources", "candidateSources"], ["external_ids", "externalIds"],
    ["match_suggestions", "matchSuggestions"], ["review_events", "reviewEvents"],
  ];
  for (const [actualKey, expectedKey] of pairs) {
    if (Number(preflight[actualKey]) !== Number(expected[expectedKey])) {
      throw new Error(`El remoto cambió después del snapshot: ${actualKey}=${preflight[actualKey]}, esperado=${expected[expectedKey]}.`);
    }
  }
  if (preflight.normalized_present) throw new Error("El esquema normalizado ya existe; se rechaza una segunda instalación.");
  if (Number(preflight.demo_rows) !== 0 || Number(preflight.google_maps_app_rows) !== 17) {
    throw new Error(`El saneamiento previo no coincide: ${JSON.stringify(preflight)}.`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (args.apply !== true && args["preflight-only"] !== true) {
    throw new Error("Falta --apply o --preflight-only.");
  }
  if (!projectRef || required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }

  const [snapshot, officialJson, officialCsv, sourceRecords, sourceCatalog, osm, paysandu, artigas] = await Promise.all([
    readInput(required(args, "remote-snapshot")), readInput(required(args, "official-json")),
    readInput(required(args, "official-csv"), "csv"), readInput(required(args, "source-records"), "csv"),
    readInput(required(args, "source-catalog"), "csv"), readInput(required(args, "osm")),
    readInput(required(args, "paysandu")), readInput(required(args, "artigas")),
  ]);
  if (snapshot.value.metadata.projectRef !== projectRef) throw new Error("El snapshot pertenece a otro proyecto.");
  const actualSnapshotHash = snapshotDataHash(snapshot.value);
  if (required(args, "snapshot-data-sha256") !== actualSnapshotHash) {
    throw new Error("El hash de datos del snapshot no coincide con la confirmación de ejecución.");
  }

  const plan = buildBackfillPlan({
    remoteSnapshot: snapshot.value, officialEntities: officialJson.value,
    officialCsvRows: officialCsv.value, sourceRecordRows: sourceRecords.value,
    sourceCatalogRows: sourceCatalog.value, osmDocument: osm.value,
    paysanduDocument: paysandu.value, artigasDocument: artigas.value,
    generatedAt: snapshot.value.metadata.retrievedAt,
  });
  if (plan.summary.publicApprovedRowsPlanned !== 0 || plan.summary.legacyRows !== 801 || plan.summary.candidates !== 175) {
    throw new Error(`El plan calculado no coincide con el ensayo aprobado: ${JSON.stringify(plan.summary)}.`);
  }

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-normalized-production-migration",
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 1_000,
  });
  client.on("error", (error) => console.error(`Error de conexión PostgreSQL: ${error.message}`));
  await client.connect();
  const migrationSql = await readFile(FORWARD_PATH, "utf8");
  const sqlTest = await readFile(SQL_TEST_PATH, "utf8");
  const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
  await mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupPath = resolve(outputDirectory, `pre_normalized_schema_backup_${uruguayDateStamp()}_${timestamp}.json`);
  const reportPath = resolve(outputDirectory, `production_normalized_migration_${uruguayDateStamp()}_${timestamp}.json`);
  let committed = false;
  try {
    const preflight = await collectPreflight(client);
    assertCounts(preflight, snapshot.value);
    if (args["preflight-only"] === true) {
      console.log(JSON.stringify({ preflightOnly: true, projectRef, snapshotDataSha256: actualSnapshotHash, preflight, plan: plan.summary }, null, 2));
      return;
    }
    const schemaBackup = await collectSchemaBackup(client);
    await writeFile(backupPath, `${JSON.stringify({ projectRef, snapshotDataSha256: actualSnapshotHash, preflight, schemaBackup }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

    await client.query("begin isolation level serializable");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query(`
        lock table public.residenciales,
          discovery_private.facility_source_runs,
          discovery_private.facility_source_observations,
          discovery_private.facility_candidates,
          discovery_private.facility_candidate_sources,
          discovery_private.facility_external_ids,
          discovery_private.facility_candidate_match_suggestions,
          discovery_private.facility_candidate_review_events
        in share row exclusive mode
      `);
      assertCounts(await collectPreflight(client), snapshot.value);
      await client.query(migrationBody(migrationSql));
      await applyNormalizedBackfill(client, plan, { manageTransaction: false });
      const after = await collectNormalizedReconciliation(client);
      const sourceCheck = await client.query(`
        select
          count(*) filter (where observation.human_note ilike '%SerpApi Google Maps%' and catalog.source_channel = 'public_maps')::integer as app_public_maps,
          count(*) filter (where catalog.source_channel is null)::integer as missing_channels
        from discovery_private.facility_source_observations observation
        join elepem_core.source_catalog catalog on catalog.id = observation.source_catalog_id
      `);
      if (Number(after.counts.facilities) !== 893 || Number(after.counts.legacy_mappings) !== 801 ||
        Number(after.counts.candidates) !== 175 || Number(after.counts.public_approved) !== 0 ||
        Number(after.integrity.public_candidates) !== 0 || Number(after.integrity.unmapped_legacy) !== 0 ||
        Number(after.integrity.orphan_mappings) !== 0 || Number(sourceCheck.rows[0].app_public_maps) !== 17 ||
        Number(sourceCheck.rows[0].missing_channels) !== 0) {
        throw new Error(`La reconciliación previa al commit falló: ${JSON.stringify({ after, sourceCheck: sourceCheck.rows[0] })}.`);
      }
      await client.query("commit");
      committed = true;

      await client.query(sqlTest);
      const finalState = await collectNormalizedReconciliation(client);
      const report = {
        schemaVersion: 1, projectRef, appliedAt: new Date().toISOString(),
        snapshotDataSha256: actualSnapshotHash,
        inputs: { remoteSnapshot: snapshot.sha256, officialJson: officialJson.sha256, officialCsv: officialCsv.sha256,
          sourceRecords: sourceRecords.sha256, sourceCatalog: sourceCatalog.sha256, osm: osm.sha256 },
        plan: plan.summary, preflight, finalState, sourceCheck: sourceCheck.rows[0],
        sqlVerificationPassed: true, runtimeSwitched: false, automaticPublication: false, backupPath,
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      console.log(JSON.stringify({ applied: true, projectRef, backupPath, reportPath, finalState,
        sourceCheck: sourceCheck.rows[0], runtimeSwitched: false, automaticPublication: false }, null, 2));
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  } catch (error) {
    if (committed) console.error("La transacción fue confirmada pero falló una verificación posterior; no se ejecutó rollback destructivo automático.");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
