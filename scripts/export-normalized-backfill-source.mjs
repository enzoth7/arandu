import { createHash } from "node:crypto";
import {
  discoveryPath,
  parseArgs,
  uruguayDateStamp,
  writeJsonAtomically,
} from "./lib/discovery-files.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

const QUERIES = {
  residenciales: `
    select
      id, name, department, locality, address, places, lat, lng, precision,
      precision_label, status_group, status_stage, status_short, source_label,
      created_at, updated_at, msp_final, msp_registro_historico,
      mides_social, pacp, other_source
    from public.residenciales
    order by id
  `,
  sourceRuns: `
    select
      id, run_key, source_type, source_url, source_license, storage_policy,
      status, started_at, completed_at, observation_count, error_summary,
      created_at
    from discovery_private.facility_source_runs
    order by id
  `,
  sourceObservations: `
    select
      id, run_id, source_type, source_record_key, source_url, retrieved_at,
      source_date, source_license, storage_policy, normalized_name,
      normalized_department, normalized_locality, normalized_address, lat, lng,
      human_note, record_hash, created_at
    from discovery_private.facility_source_observations
    order by id
  `,
  candidates: `
    select
      id, candidate_key, status, normalized_name, normalized_department,
      normalized_locality, normalized_address, lat, lng,
      best_match_residencial_id, best_match_score, evidence_tier,
      human_reviewed, reviewed_at, reviewed_by, review_note, public_eligible,
      first_seen_at, last_seen_at, created_at, updated_at
    from discovery_private.facility_candidates
    order by id
  `,
  candidateSources: `
    select
      candidate_id, observation_id, evidence_role, independence_key,
      link_method, linked_by, linked_at
    from discovery_private.facility_candidate_sources
    order by candidate_id, observation_id
  `,
  externalIds: `
    select
      id, candidate_id, residencial_id, observation_id, provider, external_id,
      external_url, link_method, linked_by, linked_at, created_at
    from discovery_private.facility_external_ids
    order by id
  `,
  matchSuggestions: `
    select
      candidate_id, residencial_id, rank, score, components, generated_at,
      created_at, updated_at
    from discovery_private.facility_candidate_match_suggestions
    order by candidate_id, rank
  `,
  reviewEvents: `
    select
      id, candidate_id, action, previous_status, new_status,
      previous_evidence_tier, new_evidence_tier, matched_residencial_id,
      reviewer_identifier, review_note, corrections, candidate_before,
      candidate_after, created_at
    from discovery_private.facility_candidate_review_events
    order by id
  `,
};

function serializeRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ]),
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) throw new Error("La exportación es siempre de solo lectura.");

  const outputPath = discoveryPath(
    args.output,
    `normalized-backfill-source-${uruguayDateStamp()}.json`,
  );
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const pool = createSupabasePool("arandu-normalized-backfill-readonly-export");
  const client = await pool.connect();

  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '60s'");

    const entries = [];
    for (const [name, sql] of Object.entries(QUERIES)) {
      const result = await client.query(sql);
      entries.push([name, serializeRows(result.rows)]);
    }

    await client.query("commit");
    const data = Object.fromEntries(entries);
    const querySha256 = createHash("sha256")
      .update(Object.values(QUERIES).join("\n-- next query --\n"))
      .digest("hex");
    const document = {
      metadata: {
        schemaVersion: 1,
        projectRef,
        retrievedAt: new Date().toISOString(),
        readOnly: true,
        excludesRawMetadata: true,
        querySha256,
        counts: Object.fromEntries(
          Object.entries(data).map(([name, rows]) => [name, rows.length]),
        ),
      },
      ...data,
    };

    await writeJsonAtomically(outputPath, document, {
      overwrite: args.overwrite === true,
    });
    console.log(
      JSON.stringify(
        {
          outputPath,
          projectRef,
          readOnly: true,
          excludesRawMetadata: true,
          counts: document.metadata.counts,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
