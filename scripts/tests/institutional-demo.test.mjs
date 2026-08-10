import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { demoIntakeEnabled, parseExperienceSubmission, parseFacilityChangeSubmission } from "../../lib/demo-intake.mjs";

const validAnswers = { daily_life: "yes", communication: "partial", participation: "no", environment: "unknown", contact: "prefer_not_to_answer" };

test("la recepción demo requiere las dos banderas", () => {
  assert.equal(demoIntakeEnabled({ DEMO_MODE: "true", DEMO_INTAKE_ENABLED: "true" }), true);
  assert.equal(demoIntakeEnabled({ DEMO_MODE: "true", DEMO_INTAKE_ENABLED: "false" }), false);
  assert.equal(demoIntakeEnabled({}), false);
});

test("la experiencia valida perfiles reservados, respuestas, destino y consentimiento", () => {
  const parsed = parseExperienceSubmission({ facilityId: "DEMO-ELEPEM-001", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", consent: true, contact: { email: "demo@demo.invalid" } });
  assert.equal(parsed?.payload.facilityId, "DEMO-ELEPEM-001");
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parsed?.contact?.email, "demo@demo.invalid");
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", consent: true }), null);
});

test("el cambio ELEPEM exige respaldo y derechos cuando contiene foto", () => {
  const parsed = parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", effectiveDate: "2026-08-10", evidenceNote: "Documento ficticio fechado el 10/8.", changes: { phone: "+598 000 002" }, hasPhoto: true, photoSourceDeclaration: "Foto propia ficticia para la demo.", photoRightsConfirmed: true });
  assert.equal(parsed?.facilityId, "DEMO-ELEPEM-002");
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", effectiveDate: "2026-08-10", evidenceNote: "Documento ficticio fechado el 10/8.", changes: {}, hasPhoto: true, photoSourceDeclaration: "sin derechos", photoRightsConfirmed: false }), null);
});

test("las APIs demo no contienen escrituras al padrón canónico", async () => {
  const paths = [
    new URL("../../app/api/experiences/route.ts", import.meta.url),
    new URL("../../app/api/institutional/facility/requests/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/decisions/route.ts", import.meta.url),
    new URL("../../lib/demo-intake-db.ts", import.meta.url),
  ];
  const source = (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?residenciales/i);
  assert.doesNotMatch(source, /(?:insert\s+into|update|delete\s+from)\s+elepem_core/i);
  assert.match(source, /is_demo/);
});
