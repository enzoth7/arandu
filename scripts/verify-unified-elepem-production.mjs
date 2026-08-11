import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { readElepemDataSource } from "../lib/elepem-data-source.mjs";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const { Client } = pg;

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["read-only"] !== true) throw new Error("Falta --read-only.");
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }
  const backupPath = resolve(PROJECT_ROOT, required(args, "backup"));
  const backupDocument = JSON.parse(await readFile(backupPath, "utf8"));
  if (backupDocument.projectRef !== projectRef) throw new Error("El respaldo pertenece a otro proyecto.");
  const legacyBefore = backupDocument.backup?.residenciales;
  if (!Array.isArray(legacyBefore) || legacyBefore.length !== 801) throw new Error("El respaldo legacy no contiene 801 filas.");

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-unified-registry-production-verification",
    connectionTimeoutMillis: 20_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '60s'");
    const legacyAfter = (await client.query(`
      select coalesce(jsonb_agg(to_jsonb(row) order by row.id), '[]'::jsonb) as rows
      from public.residenciales as row
    `)).rows[0].rows;
    const result = await client.query(`
      select jsonb_build_object(
        'legacy_total', (select count(*) from public.residenciales),
        'legacy_msp', (select count(*) from public.residenciales where msp_final),
        'legacy_mides', (select count(*) from public.residenciales where mides_social),
        'candidates', (select count(*) from discovery_private.facility_candidates),
        'resolved_candidates', (select count(*) from discovery_private.facility_candidates where resolved_facility_id is not null),
        'core_total', (select count(*) from elepem_core.facilities),
        'registry_total', (select count(*) from public.arandu_facilities_registry),
        'registry_msp', (select count(*) from public.arandu_facilities_registry where msp_final),
        'registry_mides', (select count(*) from public.arandu_facilities_registry where mides_social),
        'registry_unconfirmed', (select count(*) from public.arandu_facilities_registry where not msp_final and not mides_social),
        'location_pending', (select count(*) from elepem_core.facilities where origin_candidate_id is not null and location_status = 'location_pending'),
        'demo_prices', (select count(*) from elepem_core.facilities where demo_monthly_price_uyu is not null),
        'invalid_demo_prices', (select count(*) from elepem_core.facilities where demo_monthly_price_uyu is not null and not (registry_msp_final or registry_mides_social)),
        'source_links', (select count(*) from public.arandu_facility_source_links),
        'linked_facilities', (select count(distinct facility_id) from public.arandu_facility_source_links),
        'registry_without_source_link', (select count(*) from public.arandu_facilities_registry where jsonb_array_length(source_links) = 0),
        'internal_source_urls', (select count(*) from public.arandu_facility_source_links where source_url ilike '%supabase.co%'),
        'unauthorized_public_candidates', (
          select count(*)
          from elepem_core.facilities as facility
          join discovery_private.facility_candidates as candidate on candidate.id = facility.origin_candidate_id
          where facility.registry_visibility = 'public'
            and not (
              (candidate.status = 'verified_new' and candidate.human_reviewed and candidate.evidence_tier in ('A', 'B'))
              or exists (
                select 1 from elepem_core.audit_log as audit
                where audit.entity_type = 'facility'
                  and audit.entity_key = facility.facility_key
                  and audit.action = 'authorize_mapped_candidate_publication'
                  and audit.request_id = '20260810233000'
              )
            )
        ),
        'public_without_location', (select count(*) from elepem_core.facilities where registry_visibility = 'public' and location_status <> 'mapped'),
        'browser_view_grants', (
          select count(*) from information_schema.role_table_grants
          where table_schema = 'public'
            and table_name in ('arandu_facilities_registry', 'arandu_facility_source_links', 'arandu_facilities_identity_queue')
            and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
        )
      ) as value
    `);
    await client.query("commit");

    const state = result.rows[0].value;
    const legacyBeforeSha256 = hashJson(legacyBefore);
    const legacyAfterSha256 = hashJson(legacyAfter);
    const expected = {
      legacy_total: 801,
      legacy_msp: 212,
      legacy_mides: 275,
      candidates: 229,
      resolved_candidates: 229,
      core_total: 1121,
      registry_total: 1019,
      registry_msp: 212,
      registry_mides: 275,
      registry_unconfirmed: 702,
      location_pending: 83,
      demo_prices: 317,
      invalid_demo_prices: 0,
      internal_source_urls: 0,
      unauthorized_public_candidates: 0,
      public_without_location: 0,
      browser_view_grants: 0,
      registry_without_source_link: 51,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (Number(state[key]) !== value) throw new Error(`Verificación fallida: ${key}=${state[key]}, esperado=${value}.`);
    }
    if (legacyBeforeSha256 !== legacyAfterSha256) throw new Error("public.residenciales cambió respecto del respaldo previo.");

    const report = {
      projectRef,
      verifiedAt: new Date().toISOString(),
      readOnly: true,
      runtimeDataSource: readElepemDataSource(),
      legacyUnchanged: true,
      legacyBeforeSha256,
      legacyAfterSha256,
      backupPath,
      state,
    };
    if (report.runtimeDataSource !== "normalized") throw new Error(`El runtime no está en el registro normalizado: ${report.runtimeDataSource}.`);
    const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const reportPath = resolve(outputDirectory, `production_unified_verification_${uruguayDateStamp()}_${stamp}.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ verified: true, reportPath, ...report }, null, 2));
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
