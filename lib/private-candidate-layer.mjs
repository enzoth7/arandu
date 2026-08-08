// Lógica pura de consolidación de la capa privada de candidatos.
//
// Vivía dentro de un único `useEffect` del hook `usePrivateCandidateMapLayer`,
// mezclada con el fetch y el ciclo de vida de React, y por eso no tenía pruebas.
// Aquí queda como una función determinista: entra lo que devuelven las dos APIs
// y sale lo que el mapa y el inventario necesitan.

import { classifySources } from "./facility-sources.mjs";
import { mapPrivateCandidatesToFacilities } from "./private-candidate-map.mjs";

export const EMPTY_CANDIDATE_SUMMARY = Object.freeze({
  total: 0,
  needsReview: 0,
  possibleMatch: 0,
  verifiedNew: 0,
  otherStatuses: 0,
  mappedFromDatabase: 0,
  mappedFromManualSources: 0,
  visibleOnMap: 0,
  unlocatedCandidates: [],
  queueCandidates: [],
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function evidenceTier(value) {
  const tier = text(value);
  return tier === "A" || tier === "B" || tier === "C" ? tier : "C";
}

function isFiniteCoordinate(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

/** Las fuentes manuales sólo distinguen redes sociales del resto de la web pública. */
function manualSourceCategories(candidate) {
  return [text(candidate.dataset).toLocaleLowerCase("es-UY").includes("instagram")
    ? "social_public"
    : "other_public"];
}

function mapQueueCandidate(candidate) {
  return {
    candidateKey: text(candidate.candidate_key),
    name: text(candidate.name) || "Candidato sin nombre",
    department: text(candidate.department) || "Sin departamento",
    locality: text(candidate.locality) || "Sin localidad",
    address: text(candidate.address) || null,
    status: text(candidate.status) || "needs_review",
    evidenceTier: evidenceTier(candidate.evidence_tier),
    humanReviewed: candidate.human_reviewed === true,
    hasCoordinates: isFiniteCoordinate(candidate.latitude) && isFiniteCoordinate(candidate.longitude),
    sourceCategories: classifySources(candidate.sources),
    pendingImport: false,
    details: { ...candidate },
  };
}

function mapManualCandidateToFacility(candidate) {
  if (!candidate.hasCoordinates || candidate.latitude === null || candidate.longitude === null) return null;
  const sourceCategories = manualSourceCategories(candidate);
  return {
    id: `manual:${candidate.candidateKey}`,
    name: candidate.name,
    department: candidate.department,
    locality: candidate.locality,
    address: candidate.address || "Dirección pendiente de confirmación",
    places: null,
    lat: candidate.latitude,
    lng: candidate.longitude,
    precision: "puerta",
    precisionLabel: "Ubicación obtenida con IDE Uruguay",
    statusGroup: "candidate_private",
    statusStage: "Piloto interno",
    statusShort: "A verificar",
    sourceLabel: sourceCategories.includes("social_public")
      ? "Fuente pública de redes sociales"
      : "Webs y directorios públicos",
    mspFinal: false,
    mspRegistroHistorico: false,
    midesSocial: false,
    pacp: false,
    otherSource: false,
    pendingVerification: true,
    appDiscovered: false,
    privateCandidate: true,
    privateCandidateEvidenceTier: candidate.evidenceTier,
    privateCandidateSourceUrl: candidate.geocodingSourceUrl || undefined,
    privateCandidateRetrievedAt: candidate.retrievedAt,
    createdAt: candidate.retrievedAt,
    updatedAt: candidate.retrievedAt,
    sourceCategories,
    privateCandidateStatus: candidate.reviewStatus,
  };
}

/**
 * Consolida la cola de la base con los candidatos manuales sin ubicar.
 * @returns {{ facilities: unknown[], summary: typeof EMPTY_CANDIDATE_SUMMARY }}
 */
export function buildPrivateCandidateLayer(databaseCandidates, manualCandidates = []) {
  const database = Array.isArray(databaseCandidates) ? databaseCandidates : [];
  const manual = Array.isArray(manualCandidates) ? manualCandidates : [];

  const queueFromDatabase = database.map(mapQueueCandidate);
  const mappedKeys = new Set(queueFromDatabase.filter((c) => c.hasCoordinates).map((c) => c.candidateKey));
  const queuedKeys = new Set(queueFromDatabase.map((c) => c.candidateKey).filter(Boolean));
  const manualByKey = new Map(manual.map((candidate) => [candidate.candidateKey, candidate]));

  const databaseFacilities = mapPrivateCandidatesToFacilities(database);
  const manualFacilities = manual
    .filter((candidate) => !mappedKeys.has(candidate.candidateKey))
    .map(mapManualCandidateToFacility)
    .filter(Boolean);

  // Un candidato de la base puede haber sido geocodificado por la vía manual:
  // en ese caso se lo marca como ubicado y se suma la procedencia manual.
  const queueCandidates = queueFromDatabase.map((mapped) => {
    const manualCandidate = manualByKey.get(mapped.candidateKey);
    if (!manualCandidate?.hasCoordinates) return mapped;
    return {
      ...mapped,
      hasCoordinates: true,
      sourceCategories: [...new Set([...mapped.sourceCategories, ...manualSourceCategories(manualCandidate)])],
    };
  });

  const pendingImport = manual
    .filter((candidate) => !candidate.hasCoordinates && !queuedKeys.has(candidate.candidateKey))
    .map((candidate) => ({
      candidateKey: candidate.candidateKey,
      name: candidate.name,
      department: candidate.department || "Sin departamento",
      locality: candidate.locality || "Sin localidad",
      address: candidate.address,
      status: candidate.reviewStatus || "needs_review",
      evidenceTier: candidate.evidenceTier,
      humanReviewed: false,
      hasCoordinates: false,
      sourceCategories: manualSourceCategories(candidate),
      pendingImport: true,
      details: { ...candidate },
    }));

  const countByStatus = (status) => database.filter((candidate) => candidate.status === status).length;
  const needsReview = countByStatus("needs_review");
  const possibleMatch = countByStatus("possible_match");
  const verifiedNew = countByStatus("verified_new");

  return {
    facilities: [...databaseFacilities, ...manualFacilities],
    summary: {
      total: database.length,
      needsReview,
      possibleMatch,
      verifiedNew,
      otherStatuses: database.length - needsReview - possibleMatch - verifiedNew,
      mappedFromDatabase: databaseFacilities.length,
      mappedFromManualSources: manualFacilities.length,
      visibleOnMap: databaseFacilities.length + manualFacilities.length,
      unlocatedCandidates: manual
        .filter((candidate) => !candidate.hasCoordinates)
        .map((candidate) => ({
          candidateKey: candidate.candidateKey,
          name: candidate.name,
          department: candidate.department,
          locality: candidate.locality,
          address: candidate.address,
          evidenceTier: candidate.evidenceTier,
          historical: candidate.historical,
          alreadyInQueue: queuedKeys.has(candidate.candidateKey),
        })),
      queueCandidates: [...queueCandidates, ...pendingImport],
    },
  };
}
