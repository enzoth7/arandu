import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ideQueryUrl, selectStrictIdeResult } from "./lib/ide-geocoding.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";
import { repairMojibakeDeep } from "./lib/text-encoding.mjs";
import { loadManualDiscoveryPilot } from "../lib/manual-discovery-pilot.mjs";

const USER_AGENT = "AranduDiscovery/1.0 (controlled IDE Uruguay geocoding; contacto: contacto@arandu.com)";

function argument(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}

function optionalArgument(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`IDE respondiÃ³ HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

const outputPath = resolve(argument("--output"));
if (!process.argv.includes("--live") || !process.argv.includes("--acknowledge-ide")) {
  throw new Error("Se requieren --live y --acknowledge-ide.");
}

const useOfficialDatabaseSelection = process.argv.includes("--supabase-official-unlocated");
const useAllDatabaseSelection = process.argv.includes("--supabase-unlocated");
if (useOfficialDatabaseSelection && useAllDatabaseSelection) {
  throw new Error("Usá sólo uno de --supabase-official-unlocated o --supabase-unlocated.");
}
const candidates = [];
let scope = "Solo candidatos verified_new con evidencia A/B y direcciÃ³n independiente.";
if (useOfficialDatabaseSelection || useAllDatabaseSelection) {
  const pool = createSupabasePool("arandu-ide-official-unlocated-readonly");
  const client = await pool.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '30s'");
    const selected = useAllDatabaseSelection ? await client.query(`
      select
        candidate.candidate_key as "candidateKey",
        candidate.normalized_name as name,
        candidate.normalized_department as department,
        candidate.normalized_locality as locality,
        candidate.normalized_address as address,
        candidate.status as "candidateStatus",
        candidate.evidence_tier as "evidenceTier",
        candidate.reviewed_by as "reviewedBy",
        candidate.reviewed_at as "reviewedAt"
      from discovery_private.facility_candidates as candidate
      where candidate.lat is null and candidate.lng is null
        and nullif(trim(candidate.normalized_address), '') is not null
        and nullif(trim(candidate.normalized_department), '') is not null
        and candidate.status in ('needs_review', 'verified_new')
      order by candidate.id
    `) : await client.query(`
      select distinct on (candidate.id)
        candidate.candidate_key as "candidateKey",
        candidate.normalized_name as name,
        candidate.normalized_department as department,
        candidate.normalized_locality as locality,
        candidate.normalized_address as address,
        candidate.status as "candidateStatus",
        candidate.evidence_tier as "evidenceTier",
        candidate.reviewed_by as "reviewedBy",
        candidate.reviewed_at as "reviewedAt"
      from discovery_private.facility_candidates as candidate
      join discovery_private.facility_candidate_sources as candidate_source
        on candidate_source.candidate_id = candidate.id
      join discovery_private.facility_source_observations as observation
        on observation.id = candidate_source.observation_id
      where observation.source_type = 'official'
        and (candidate.lat is null or candidate.lng is null)
        and nullif(trim(candidate.normalized_address), '') is not null
        and candidate.status in ('needs_review', 'verified_new')
        and candidate.public_eligible = false
      order by candidate.id, observation.retrieved_at desc
    `);
    candidates.push(...selected.rows);
    await client.query("commit");
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  if (useAllDatabaseSelection) {
    const existingKeys = new Set(candidates.map((candidate) => candidate.candidateKey));
    const pilot = await loadManualDiscoveryPilot(process.cwd());
    for (const candidate of pilot.candidates) {
      if (existingKeys.has(candidate.candidateKey) || candidate.hasCoordinates || !candidate.address || !candidate.department) continue;
      candidates.push({
        candidateKey: candidate.candidateKey,
        name: candidate.name,
        department: candidate.department,
        locality: candidate.locality,
        address: candidate.address,
        candidateStatus: "needs_review",
        evidenceTier: candidate.evidenceTier,
        reviewedBy: null,
        reviewedAt: null,
      });
    }
    scope = "Todos los candidatos privados con dirección y sin coordenadas, incluidas entradas manuales pendientes; consulta IDE sin escritura en Supabase.";
  } else {
    scope = "Candidatos privados con fuente oficial, direcciÃ³n y sin coordenadas; consulta IDE sin escritura en Supabase.";
  }
} else {
  const sourcesArgument = optionalArgument("--sources");
  const reviewsArgument = optionalArgument("--reviews");
  if (!sourcesArgument || !reviewsArgument) {
    throw new Error("Se requieren --sources y --reviews, o --supabase-official-unlocated.");
  }
  const sourcePaths = sourcesArgument.split(",").map((value) => resolve(value.trim()));
  const reviewPaths = reviewsArgument.split(",").map((value) => resolve(value.trim()));
  if (sourcePaths.length !== reviewPaths.length) throw new Error("--sources y --reviews deben tener la misma cantidad de archivos.");
  for (let index = 0; index < sourcePaths.length; index += 1) {
    const [source, review] = await Promise.all([
      readFile(sourcePaths[index], "utf8").then(JSON.parse),
      readFile(reviewPaths[index], "utf8").then(JSON.parse),
    ]);
    const records = new Map((source.records || []).map((record) => [record.candidate_key, record]));
    for (const decision of review.decisions || []) {
      if (decision.humanDecision !== "verified_new" || decision.eligibleForStep14 !== true) continue;
      const record = records.get(decision.candidateKey);
      if (!record?.address) continue;
      candidates.push({
        candidateKey: decision.candidateKey,
        name: record.observed_name,
        department: record.department,
        locality: record.locality,
        address: record.address,
        candidateStatus: "verified_new",
        evidenceTier: decision.evidenceTier,
        reviewedBy: decision.reviewerIdentifier,
        reviewedAt: decision.reviewedAt,
      });
    }
  }
}

const unique = [...new Map(candidates.map((candidate) => [candidate.candidateKey, candidate])).values()];
const results = [];
for (const candidate of unique) {
  const sourceUrl = ideQueryUrl(candidate);
  try {
    const response = await fetchJson(sourceUrl);
    const match = selectStrictIdeResult(response, candidate);
    results.push({
      ...candidate,
      sourceType: "ide_uy",
      sourceUrl,
      retrievedAt: new Date().toISOString(),
      sourceLicense: "IDE Uruguay API",
      status: match ? "strict_exact_pending_human_coordinate_review" : "needs_review",
      latitude: match?.puntoY ?? null,
      longitude: match?.puntoX ?? null,
      humanCoordinateReviewStatus: "pending",
      responseError: match ? null : "No hubo coincidencia estricta de puerta, localidad y departamento.",
    });
  } catch (error) {
    results.push({
      ...candidate,
      sourceType: "ide_uy",
      sourceUrl,
      retrievedAt: new Date().toISOString(),
      sourceLicense: "IDE Uruguay API",
      status: "error",
      latitude: null,
      longitude: null,
      humanCoordinateReviewStatus: "pending",
      responseError: error instanceof Error ? error.message : "Error desconocido",
    });
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
}

const report = {
  metadata: {
    generatedAt: new Date().toISOString(),
    source: "IDE Uruguay",
    sourceBaseUrl: "https://direcciones.ide.uy",
    scope,
    selectionMode: useAllDatabaseSelection
      ? "supabase_all_unlocated_with_address"
      : useOfficialDatabaseSelection ? "supabase_official_unlocated" : "reviewed_department_files",
    humanCoordinateReviewRequired: true,
    supabaseWrites: 0,
    publicResidencialesWrites: 0,
    automaticPublication: false,
  },
  summary: {
    queried: results.length,
    strictExactPendingHumanReview: results.filter((item) => item.status === "strict_exact_pending_human_coordinate_review").length,
    needsReview: results.filter((item) => item.status === "needs_review").length,
    errors: results.filter((item) => item.status === "error").length,
  },
  results,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(repairMojibakeDeep(report), null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, ...report.summary, supabaseWrites: 0, publicWrites: 0 }, null, 2));
