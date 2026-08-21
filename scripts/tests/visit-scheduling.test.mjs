import assert from "node:assert/strict";
import test from "node:test";
import {
  nextVisitState,
  parseFacilityVisitAction,
  parseVisitExperience,
  parseVisitRequest,
  parseVisitorVisitAction,
} from "../../lib/visit-scheduling.mjs";

const NOW = Date.parse("2026-08-21T12:00:00-03:00");
const FUTURE = "2026-08-25T14:00:00-03:00";

test("validates a minimal private visit request", () => {
  const parsed = parseVisitRequest({
    facilityId: 42,
    preferredStartAt: FUTURE,
    contactName: "Ana",
    contactEmail: "ana@example.com",
    contactPhone: "",
    partySize: 2,
    practicalNote: "Necesitamos confirmar si hay escalones.",
    acknowledgedNotConfirmation: true,
  }, NOW);
  assert.equal(parsed?.facilityId, 42);
  assert.equal(parsed?.partySize, 2);
});

test("rejects medical data and requests without acknowledgement", () => {
  assert.equal(parseVisitRequest({
    facilityId: 42, preferredStartAt: FUTURE, contactName: "Ana", contactEmail: "ana@example.com",
    partySize: 2, practicalNote: "Diagnóstico de la persona", acknowledgedNotConfirmation: true,
  }, NOW), null);
  assert.equal(parseVisitRequest({
    facilityId: 42, preferredStartAt: FUTURE, contactName: "Ana", contactEmail: "ana@example.com",
    partySize: 2, acknowledgedNotConfirmation: false,
  }, NOW), null);
});

test("valid state machine keeps requests distinct from confirmations", () => {
  assert.deepEqual(nextVisitState("solicitada", "propose", { startAt: FUTURE }), {
    status: "horario_propuesto", proposedStartAt: FUTURE, confirmedStartAt: null,
  });
  assert.deepEqual(nextVisitState("horario_propuesto", "accept_proposal", { proposedStartAt: FUTURE }), {
    status: "confirmada", confirmedStartAt: FUTURE,
  });
  assert.equal(nextVisitState("solicitada", "complete", { confirmedStartAt: FUTURE, now: NOW }), null);
  assert.equal(nextVisitState("cancelada_usuario", "confirm", { startAt: FUTURE }), null);
});

test("completion is only accepted after the confirmed time", () => {
  assert.equal(nextVisitState("confirmada", "complete", { confirmedStartAt: FUTURE, now: NOW }), null);
  assert.deepEqual(nextVisitState("confirmada", "complete", {
    confirmedStartAt: "2026-08-20T14:00:00-03:00", now: NOW,
  }), { status: "realizada" });
});

test("parses actor actions with future times", () => {
  assert.equal(parseVisitorVisitAction({ action: "request_alternative", preferredStartAt: FUTURE }, NOW)?.action, "request_alternative");
  assert.equal(parseFacilityVisitAction({ action: "propose", startAt: FUTURE, facilityNote: "Otro horario" }, NOW)?.action, "propose");
  assert.equal(parseFacilityVisitAction({ action: "confirm", startAt: "2026-08-20T10:00:00-03:00" }, NOW), null);
});

test("visit experience is explicit and excludes unsupported answers", () => {
  const parsed = parseVisitExperience({
    visitId: "7cf04784-7f68-45a9-9eef-c960a3cf8879",
    spaces: ["common_areas"], questionsAnswered: "some", topics: ["team_direction"],
    costInformation: ["written_contract"], usefulInformation: "La explicación del contrato.",
    missingInformation: "Conocer el patio.", firstHandConfirmed: true,
    noPersonalDataConfirmed: true, publicationConsent: true,
  });
  assert.equal(parsed?.experienceKind, "visit");
  assert.equal(parsed?.requestedDestination, "consider_anonymized");
  assert.equal(parseVisitExperience({ visitId: "bad" }), null);
});
