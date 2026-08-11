import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAddress, normalizeName, normalizeText } from "../lib/facility-matching.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPORTS_DIRECTORY = resolve(PROJECT_ROOT, "data", "reports");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else args[argument.slice(2)] = true;
  }
  return args;
}

function safeInput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const rel = relative(PROJECT_ROOT, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || !path.endsWith(".json")) throw new Error("Insumo invalido.");
  return path;
}

function safeOutput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const rel = relative(REPORTS_DIRECTORY, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || !path.endsWith(".json")) {
    throw new Error("La salida debe ser JSON dentro de data/reports/.");
  }
  return path;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function approvedRows(document, reviewDocument = null) {
  const approvedKeys = reviewDocument
    ? new Set((reviewDocument.approved || []).map((item) => item.candidateKey))
    : null;
  return (document.results || []).filter((item) =>
    item.status === "strict_exact_pending_human_coordinate_review" &&
    item.humanCoordinateReviewStatus === "pending" &&
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
    (!approvedKeys || approvedKeys.has(item.candidateKey)),
  );
}

async function inspect(client, rows) {
  await client.query("begin transaction read only");
  try {
    const keys = rows.map((row) => row.candidateKey);
    const candidates = await client.query(`
      select id::text, candidate_key, status, evidence_tier, lat, lng,
             human_reviewed, reviewed_by, public_eligible
      from discovery_private.facility_candidates
      where candidate_key = any($1::text[])
      order by candidate_key
    `, [keys]);
    const publicCount = await client.query("select count(*)::integer as count from public.residenciales");
    await client.query("commit");
    const byKey = new Map(candidates.rows.map((row) => [row.candidate_key, row]));
    const missing = rows.filter((row) => !byKey.has(row.candidateKey)).map((row) => row.candidateKey);
    const conflicts = rows.flatMap((row) => {
      const candidate = byKey.get(row.candidateKey);
      if (!candidate) return [];
      const coordinatesConflict = candidate.lat !== null && candidate.lng !== null &&
        (Math.abs(Number(candidate.lat) - row.latitude) > 1e-9 || Math.abs(Number(candidate.lng) - row.longitude) > 1e-9);
      return !["needs_review", "verified_new"].includes(candidate.status) ||
        !["A", "B", "C"].includes(candidate.evidence_tier) ||
        candidate.public_eligible !== false || coordinatesConflict
        ? [{ candidateKey: row.candidateKey, status: candidate.status, evidenceTier: candidate.evidence_tier, coordinatesConflict }]
        : [];
    });
    return {
      requested: rows.length,
      found: candidates.rowCount,
      missing,
      conflicts,
      alreadyWithSameCoordinates: rows.filter((row) => {
        const candidate = byKey.get(row.candidateKey);
        return candidate?.lat !== null && candidate?.lng !== null &&
          Math.abs(Number(candidate.lat) - row.latitude) <= 1e-9 &&
          Math.abs(Number(candidate.lng) - row.longitude) <= 1e-9;
      }).length,
      publicResidenciales: publicCount.rows[0].count,
      safeToApply: missing.length === 0 && conflicts.length === 0 && candidates.rowCount === rows.length,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

async function apply(client, rows, reviewer, inputHash) {
  await client.query("begin");
  try {
    await client.query("set local statement_timeout = '45s'");
    await client.query("set local lock_timeout = '5s'");
    const publicBefore = (await client.query("select count(*)::integer as count from public.residenciales")).rows[0].count;
    const completedAt = new Date().toISOString();
    const runKey = `ide-uy:approved-coordinates:${inputHash.slice(0, 24)}`;
    const run = await client.query(`
      insert into discovery_private.facility_source_runs (
        run_key, source_type, source_url, source_license, storage_policy,
        status, started_at, completed_at, observation_count
      ) values ($1,'other','https://direcciones.ide.uy','IDE Uruguay API','normalized_only','succeeded',$2,$2,$3)
      on conflict (run_key) do update set
        status='succeeded', completed_at=excluded.completed_at,
        observation_count=excluded.observation_count, error_summary=null
      returning id
    `, [runKey, completedAt, rows.length]);
    const runId = run.rows[0].id;
    let observations = 0;
    let links = 0;
    let candidatesUpdated = 0;
    let reviewEvents = 0;

    for (const row of rows) {
      const currentResult = await client.query(`
        select * from discovery_private.facility_candidates
        where candidate_key=$1 for update
      `, [row.candidateKey]);
      const current = currentResult.rows[0];
      if (!current) throw new Error(`${row.candidateKey}: candidato inexistente.`);
      if (!["needs_review", "verified_new"].includes(current.status) ||
          !["A", "B", "C"].includes(current.evidence_tier) || current.public_eligible !== false) {
        throw new Error(`${row.candidateKey}: estado incompatible con la aprobacion de coordenadas.`);
      }
      if (current.lat !== null && current.lng !== null &&
          (Math.abs(Number(current.lat) - row.latitude) > 1e-9 || Math.abs(Number(current.lng) - row.longitude) > 1e-9)) {
        throw new Error(`${row.candidateKey}: ya tiene coordenadas diferentes.`);
      }

      const sourceRecordKey = `ide-uy:${sha256(row.candidateKey).slice(0, 24)}`;
      const observation = {
        sourceType: "other",
        sourceRecordKey,
        sourceUrl: row.sourceUrl,
        retrievedAt: row.retrievedAt,
        sourceDate: String(row.retrievedAt).slice(0, 10),
        sourceLicense: "IDE Uruguay API",
        storagePolicy: "normalized_only",
        normalizedName: normalizeName(row.name),
        normalizedDepartment: normalizeText(row.department),
        normalizedLocality: normalizeText(row.locality),
        normalizedAddress: normalizeAddress(row.address, row),
        lat: row.latitude,
        lng: row.longitude,
        humanNote: `Coordenada IDE Uruguay aprobada por ${reviewer}; pendiente de publicacion explicita.`,
        rawMetadataStoragePermitted: false,
      };
      const recordHash = sha256(JSON.stringify(observation));
      const insertedObservation = await client.query(`
        insert into discovery_private.facility_source_observations (
          run_id, source_type, source_record_key, source_url, retrieved_at,
          source_date, source_license, storage_policy, normalized_name,
          normalized_department, normalized_locality, normalized_address,
          lat, lng, human_note, raw_metadata_storage_permitted, raw_metadata,
          record_hash
        ) values ($1,'other',$2,$3,$4,$5,$6,'normalized_only',$7,$8,$9,$10,$11,$12,$13,false,null,$14)
        on conflict (run_id, source_type, source_record_key) do nothing
        returning id
      `, [runId, sourceRecordKey, row.sourceUrl, row.retrievedAt,
        observation.sourceDate, observation.sourceLicense, observation.normalizedName,
        observation.normalizedDepartment, observation.normalizedLocality,
        observation.normalizedAddress, row.latitude, row.longitude,
        observation.humanNote, recordHash]);
      observations += insertedObservation.rowCount;
      const observationId = insertedObservation.rows[0]?.id || (await client.query(`
        select id from discovery_private.facility_source_observations
        where run_id=$1 and source_type='other' and source_record_key=$2
      `, [runId, sourceRecordKey])).rows[0]?.id;
      if (!observationId) throw new Error(`${row.candidateKey}: no se pudo resolver la observacion IDE.`);

      const linked = await client.query(`
        insert into discovery_private.facility_candidate_sources (
          candidate_id, observation_id, evidence_role, independence_key,
          link_method, linked_by
        ) values ($1,$2,'context','ide_uy','human',$3)
        on conflict (candidate_id, observation_id) do nothing
        returning candidate_id
      `, [current.id, observationId, reviewer]);
      links += linked.rowCount;

      const note = `${current.review_note ? `${current.review_note} ` : ""}Coordenada IDE Uruguay aprobada manualmente por ${reviewer} el ${completedAt.slice(0, 10)}.`.slice(0, 2000);
      const updatedResult = await client.query(`
        update discovery_private.facility_candidates
        set lat=$2, lng=$3, human_reviewed=true, reviewed_at=$4,
            reviewed_by=$5, review_note=$6, public_eligible=false,
            updated_at=now()
        where id=$1
        returning *
      `, [current.id, row.latitude, row.longitude, completedAt, reviewer, note]);
      candidatesUpdated += updatedResult.rowCount;
      const updated = updatedResult.rows[0];
      const reviewAction = current.status === "verified_new" ? "verified_new" : "needs_more_evidence";
      const event = await client.query(`
        insert into discovery_private.facility_candidate_review_events (
          candidate_id, action, previous_status, new_status,
          previous_evidence_tier, new_evidence_tier, matched_residencial_id,
          reviewer_identifier, review_note, corrections, candidate_before,
          candidate_after, created_at
        ) values ($1,$2,$3,$4,$5,$6,null,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12)
        returning id
      `, [current.id, reviewAction, current.status, updated.status, current.evidence_tier,
        updated.evidence_tier, reviewer,
        "Coordenada IDE Uruguay revisada y aprobada; no autoriza publicacion.",
        JSON.stringify({ latitude: row.latitude, longitude: row.longitude, coordinateSource: "ide_uy" }),
        JSON.stringify(current), JSON.stringify(updated), completedAt]);
      reviewEvents += event.rowCount;
    }

    const publicAfter = (await client.query("select count(*)::integer as count from public.residenciales")).rows[0].count;
    if (publicBefore !== publicAfter) throw new Error("Cambio inesperado en public.residenciales.");
    const verification = await client.query(`
      select candidate_key, lat, lng, status, evidence_tier, reviewed_by, public_eligible
      from discovery_private.facility_candidates
      where candidate_key=any($1::text[])
      order by candidate_key
    `, [rows.map((row) => row.candidateKey)]);
    if (verification.rowCount !== rows.length || verification.rows.some((row) => row.lat === null || row.lng === null || row.public_eligible)) {
      throw new Error("La reconciliacion de coordenadas privadas fallo.");
    }
    await client.query("commit");
    return {
      publicResidencialesBefore: publicBefore,
      publicResidencialesAfter: publicAfter,
      observationsInserted: observations,
      linksInserted: links,
      candidatesUpdated,
      reviewEventsInserted: reviewEvents,
      reconciledCandidates: verification.rowCount,
      publicEligibleCandidates: verification.rows.filter((row) => row.public_eligible).length,
      rows: verification.rows,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output || !args.reviewer) throw new Error("Faltan --input, --output o --reviewer.");
  const inputPath = safeInput(args.input);
  const outputPath = safeOutput(args.output);
  const raw = await readFile(inputPath, "utf8");
  const reviewPath = args.review ? safeInput(args.review) : null;
  const reviewRaw = reviewPath ? await readFile(reviewPath, "utf8") : null;
  const reviewDocument = reviewRaw ? JSON.parse(reviewRaw) : null;
  const rows = approvedRows(JSON.parse(raw), reviewDocument);
  const expectedCount = Number(args["expected-count"] || reviewDocument?.approved?.length || 25);
  const approvedKeys = reviewDocument?.approved?.map((item) => item.candidateKey) || [];
  if (reviewDocument && new Set(approvedKeys).size !== approvedKeys.length) throw new Error("La revision contiene claves duplicadas.");
  if (reviewDocument && String(reviewDocument.reviewer) !== String(args.reviewer)) throw new Error("El revisor no coincide con el artefacto de aprobacion.");
  if (rows.length !== expectedCount) throw new Error(`Se esperaban ${expectedCount} coordenadas aprobadas y se encontraron ${rows.length}.`);
  const inputHash = sha256(raw);
  const reviewHash = reviewRaw ? sha256(reviewRaw) : null;
  const pool = createSupabasePool("arandu-approved-ide-coordinates");
  const client = await pool.connect();
  try {
    const inspection = await inspect(client, rows);
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        apply: args.apply === true,
        reviewer: String(args.reviewer).slice(0, 200),
        inputHash,
        reviewHash,
        approvedCandidateKeys: rows.map((row) => row.candidateKey),
        privateOnly: true,
        automaticPublication: false,
      },
      inspection,
      databaseApply: null,
    };
    if (args.apply === true) {
      if (!inspection.safeToApply) throw new Error("El preflight detecto faltantes o conflictos.");
      report.databaseApply = await apply(client, rows, report.metadata.reviewer, inputHash);
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output: relative(PROJECT_ROOT, outputPath).replaceAll("\\", "/"), inspection, databaseApply: report.databaseApply }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
