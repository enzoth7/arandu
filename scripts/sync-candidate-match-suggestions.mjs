import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readElepemDataSource } from "../lib/elepem-data-source.mjs";
import { parseArgs } from "./lib/discovery-files.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function suggestionRows(document) {
  const root = record(document);
  const metadata = record(root.metadata);
  if (metadata.writesPublicResidenciales !== false || metadata.requiresHumanReview !== true) {
    throw new Error("El reporte no declara revisión humana y cero escrituras públicas.");
  }
  if (!Array.isArray(root.candidates)) throw new Error("El reporte no contiene candidatos.");
  const rows = [];
  for (const candidateValue of root.candidates) {
    const candidate = record(candidateValue);
    const candidateKey = text(candidate.candidateKey, 360);
    const matches = Array.isArray(candidate.matches) ? candidate.matches : [];
    for (const matchValue of matches.slice(0, 3)) {
      const match = record(matchValue);
      const rank = rows.filter((row) => row.candidateKey === candidateKey).length + 1;
      const score = Number(match.score);
      const residencialId = text(match.residencialId, 300);
      if (!candidateKey || !residencialId || !Number.isFinite(score)) continue;
      rows.push({
        candidateKey,
        rank,
        residencialId,
        score,
        components: record(match.components),
        generatedAt: text(metadata.generatedAt, 80),
      });
    }
  }
  return rows;
}

async function countPublic(client) {
  const result = await client.query(
    "select count(*)::integer as count from public.residenciales",
  );
  return result.rows[0].count;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error("Falta --input <osm-candidate-review.json>.");
  if (args.apply !== true) {
    throw new Error("La sincronización exige --apply y solo escribe sugerencias privadas.");
  }
  const inputPath = resolve(String(args.input));
  const document = JSON.parse(await readFile(inputPath, "utf8"));
  const rows = suggestionRows(document);
  const dataSource = readElepemDataSource();
  const pool = createSupabasePool("arandu-private-match-suggestion-sync");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '20s'");
    const before = await countPublic(client);
    await client.query(
      `with incoming as (
         select distinct "candidateKey"
         from jsonb_to_recordset($1::jsonb) as row("candidateKey" text)
       )
       delete from discovery_private.facility_candidate_match_suggestions as suggestion
       using discovery_private.facility_candidates as candidate, incoming
       where suggestion.candidate_id = candidate.id
         and candidate.candidate_key = incoming."candidateKey"`,
      [JSON.stringify(rows)],
    );
    const insertSql = dataSource === "normalized"
      ? `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           "candidateKey" text,
           rank smallint,
           "residencialId" text,
           score numeric,
           components jsonb,
           "generatedAt" timestamptz
         )
       )
       insert into discovery_private.facility_candidate_match_suggestions (
         candidate_id,
         residencial_id,
         facility_id,
         rank,
         score,
         components,
         generated_at
       )
       select
         candidate.id,
         mapping.legacy_residencial_id,
         facility.facility_id,
         incoming.rank,
         incoming.score,
         incoming.components,
         incoming."generatedAt"
       from incoming
       join discovery_private.facility_candidates as candidate
         on candidate.candidate_key = incoming."candidateKey"
       left join elepem_core.legacy_facility_map as input_mapping
         on input_mapping.legacy_residencial_id = incoming."residencialId"
        and input_mapping.mapping_status = 'mapped'
       join lateral (
         select current_facility.*
         from public.facilities_current_internal as current_facility
         where current_facility.facility_key = incoming."residencialId"
            or current_facility.facility_id = input_mapping.facility_id
         order by (current_facility.facility_key = incoming."residencialId") desc
         limit 1
       ) as facility on true
       join public.known_facilities_exclusion_view as exclusion
         on exclusion.subject_type = 'normalized_facility'
        and exclusion.subject_id = facility.facility_key
       left join lateral (
         select legacy.legacy_residencial_id
         from elepem_core.legacy_facility_map as legacy
         where legacy.facility_id = facility.facility_id
           and legacy.mapping_status = 'mapped'
         order by legacy.legacy_residencial_id
         limit 1
       ) as mapping on true
       on conflict (candidate_id, rank) do update set
         residencial_id = excluded.residencial_id,
         facility_id = excluded.facility_id,
         score = excluded.score,
         components = excluded.components,
         generated_at = excluded.generated_at,
         updated_at = now()
       returning candidate_id`
      : `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           "candidateKey" text,
           rank smallint,
           "residencialId" text,
           score numeric,
           components jsonb,
           "generatedAt" timestamptz
         )
       )
       insert into discovery_private.facility_candidate_match_suggestions (
         candidate_id,
         residencial_id,
         rank,
         score,
         components,
         generated_at
       )
       select
         candidate.id,
         residencial.id,
         incoming.rank,
         incoming.score,
         incoming.components,
         incoming."generatedAt"
       from incoming
       join discovery_private.facility_candidates as candidate
         on candidate.candidate_key = incoming."candidateKey"
       join ${dataSource === "compatibility"
         ? "public.residenciales_legacy_compat"
         : "public.residenciales"} as residencial
         on residencial.id = incoming."residencialId"
       on conflict (candidate_id, rank) do update set
         residencial_id = excluded.residencial_id,
         score = excluded.score,
         components = excluded.components,
         generated_at = excluded.generated_at,
         updated_at = now()
       returning candidate_id`;
    const inserted = await client.query(insertSql, [JSON.stringify(rows)]);
    const after = await countPublic(client);
    if (before !== after) throw new Error("Cambió public.residenciales; se revierte.");
    await client.query("commit");
    console.log(JSON.stringify({
      inputPath,
      suggestions: inserted.rowCount,
      publicResidencialesBefore: before,
      publicResidencialesAfter: after,
      dataSource,
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
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
