import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrivateCandidateLayer,
  EMPTY_CANDIDATE_SUMMARY,
} from "../../lib/private-candidate-layer.mjs";

function databaseCandidate(overrides = {}) {
  return {
    id: "db-1",
    candidate_key: "osm:1",
    name: "hogar los abuelos",
    department: "PAYSANDU",
    locality: "centro",
    address: "Calle 1",
    status: "needs_review",
    evidence_tier: "B",
    human_reviewed: false,
    latitude: -32.31,
    longitude: -58.08,
    sources: [{ sourceType: "openstreetmap", sourceUrl: "https://openstreetmap.org/1" }],
    ...overrides,
  };
}

function manualCandidate(overrides = {}) {
  return {
    candidateKey: "manual:1",
    name: "Residencial Manual",
    department: "Artigas",
    locality: "Artigas",
    address: "Ruta 3",
    coordinateStatus: "needs_geocoding",
    mapAction: "hidden",
    reviewStatus: "needs_review",
    evidenceTier: "C",
    historical: false,
    hasCoordinates: false,
    latitude: null,
    longitude: null,
    geocodingSourceUrl: null,
    dataset: "instagram_paysandu",
    retrievedAt: "2026-08-02",
    ...overrides,
  };
}

test("sin datos devuelve un resumen vacío equivalente al inicial", () => {
  const { facilities, summary } = buildPrivateCandidateLayer([], []);
  assert.deepEqual(facilities, []);
  assert.equal(summary.total, EMPTY_CANDIDATE_SUMMARY.total);
  assert.equal(summary.visibleOnMap, 0);
  assert.deepEqual(summary.queueCandidates, []);
});

test("tolera entradas que no son listas", () => {
  const { facilities, summary } = buildPrivateCandidateLayer(null, undefined);
  assert.deepEqual(facilities, []);
  assert.equal(summary.total, 0);
});

test("cuenta estados y clasifica otros estados en el resto", () => {
  const { summary } = buildPrivateCandidateLayer([
    databaseCandidate({ id: "a", candidate_key: "a", status: "needs_review" }),
    databaseCandidate({ id: "b", candidate_key: "b", status: "possible_match" }),
    databaseCandidate({ id: "c", candidate_key: "c", status: "verified_new" }),
    databaseCandidate({ id: "d", candidate_key: "d", status: "rejected" }),
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.needsReview, 1);
  assert.equal(summary.possibleMatch, 1);
  assert.equal(summary.verifiedNew, 1);
  assert.equal(summary.otherStatuses, 1);
});

test("un candidato sin coordenadas no llega al mapa pero sí a la cola", () => {
  const { facilities, summary } = buildPrivateCandidateLayer([
    databaseCandidate({ latitude: null, longitude: null }),
  ]);
  assert.equal(facilities.length, 0);
  assert.equal(summary.visibleOnMap, 0);
  assert.equal(summary.queueCandidates.length, 1);
  assert.equal(summary.queueCandidates[0].hasCoordinates, false);
});

test("los candidatos manuales sin ubicar quedan pendientes de importación", () => {
  const { summary } = buildPrivateCandidateLayer([], [manualCandidate()]);
  assert.equal(summary.unlocatedCandidates.length, 1);
  assert.equal(summary.unlocatedCandidates[0].alreadyInQueue, false);
  const pending = summary.queueCandidates.filter((candidate) => candidate.pendingImport);
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].sourceCategories, ["social_public"]);
});

test("un manual ya presente en la cola no se duplica como pendiente", () => {
  const { summary } = buildPrivateCandidateLayer(
    [databaseCandidate({ candidate_key: "shared", latitude: null, longitude: null })],
    [manualCandidate({ candidateKey: "shared" })],
  );
  assert.equal(summary.queueCandidates.length, 1);
  assert.equal(summary.unlocatedCandidates[0].alreadyInQueue, true);
});

test("la geocodificación manual marca como ubicado al candidato de la base y suma procedencia", () => {
  const { summary } = buildPrivateCandidateLayer(
    [databaseCandidate({ candidate_key: "shared", latitude: null, longitude: null })],
    [manualCandidate({
      candidateKey: "shared",
      hasCoordinates: true,
      latitude: -30.4,
      longitude: -56.47,
      dataset: "instagram_paysandu",
    })],
  );
  const [candidate] = summary.queueCandidates;
  assert.equal(candidate.hasCoordinates, true);
  assert.ok(candidate.sourceCategories.includes("public_maps"));
  assert.ok(candidate.sourceCategories.includes("social_public"));
});

test("el manual no se dibuja dos veces si la base ya aportó coordenadas", () => {
  const { facilities, summary } = buildPrivateCandidateLayer(
    [databaseCandidate({ candidate_key: "shared" })],
    [manualCandidate({ candidateKey: "shared", hasCoordinates: true, latitude: -30.4, longitude: -56.4 })],
  );
  assert.equal(summary.mappedFromManualSources, 0);
  assert.equal(summary.mappedFromDatabase, 1);
  assert.equal(facilities.length, 1);
});

test("el manual ubicado y ausente de la base sí se dibuja", () => {
  const { facilities, summary } = buildPrivateCandidateLayer(
    [],
    [manualCandidate({ hasCoordinates: true, latitude: -30.4, longitude: -56.4, dataset: "webs" })],
  );
  assert.equal(summary.mappedFromManualSources, 1);
  assert.equal(facilities.length, 1);
  assert.equal(facilities[0].id, "manual:manual:1");
  assert.equal(facilities[0].privateCandidate, true);
  assert.equal(facilities[0].sourceLabel, "Webs y directorios públicos");
});

test("un nivel de evidencia inválido cae a C", () => {
  const { summary } = buildPrivateCandidateLayer([databaseCandidate({ evidence_tier: "Z" })]);
  assert.equal(summary.queueCandidates[0].evidenceTier, "C");
});
