import assert from "node:assert/strict";
import test from "node:test";
import { assertAfter, assertBefore } from "../publish-all-mapped-candidates.mjs";

const before = {
  legacy_total: 801,
  legacy_msp: 212,
  legacy_mides: 275,
  legacy_hash: "same",
  registry_total: 910,
  registry_msp: 212,
  registry_mides: 275,
  registry_unconfirmed: 593,
  mapped_candidates: 145,
  public_mapped_candidates: 36,
  held_mapped_candidates: 109,
  candidate_location_pending: 83,
  candidate_address_gaps: 15,
  candidate_geocode_gaps: 15,
  hogar_emanuel_visible: false,
};

const after = {
  ...before,
  registry_total: 1019,
  registry_unconfirmed: 702,
  public_mapped_candidates: 145,
  held_mapped_candidates: 0,
  candidate_address_gaps: 0,
  candidate_geocode_gaps: 0,
  hogar_emanuel_visible: true,
};

test("acepta exactamente el estado productivo auditado", () => {
  assert.doesNotThrow(() => assertBefore(before));
  assert.doesNotThrow(() => assertAfter(before, after));
});

test("rechaza cambios en MSP, MIDES o el padrón legacy", () => {
  assert.throws(() => assertAfter(before, { ...after, registry_msp: 213 }), /registry_msp/);
  assert.throws(() => assertAfter(before, { ...after, legacy_hash: "changed" }), /public\.residenciales/);
});

test("exige que todos los candidatos mapeados queden visibles", () => {
  assert.throws(() => assertAfter(before, { ...after, held_mapped_candidates: 1 }), /held_mapped_candidates/);
  assert.throws(() => assertAfter(before, { ...after, hogar_emanuel_visible: false }), /Hogar Emanuel/);
});
