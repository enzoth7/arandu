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

test("la experiencia valida un identificador del padrón, respuestas, destino y consentimiento", () => {
  const parsed = parseExperienceSubmission({ facilityId: "REAL-123", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", publicationConsent: false, consent: true, contact: { email: "persona@example.com" } });
  assert.equal(parsed?.payload.facilityId, "REAL-123");
  assert.equal(parsed?.payload.version, 3);
  assert.equal(parsed?.payload.publicationConsent, false);
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parsed?.contact?.email, "persona@example.com");
  assert.equal(parseExperienceSubmission({ facilityId: "", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", publicationConsent: false, consent: true }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "X".repeat(241), relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", publicationConsent: false, consent: true }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "consider_anonymized", publicationConsent: false, consent: true }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", relationship: "Familiar", period: "2026", answers: validAnswers, requestedDestination: "aggregate", publicationConsent: true, consent: true }), null);
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
    new URL("../../lib/experience-publication-db.ts", import.meta.url),
  ];
  const source = (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?residenciales/i);
  assert.doesNotMatch(source, /(?:insert\s+into|update|delete\s+from)\s+elepem_core\.facilities\b/i);
  assert.match(source, /facility_experience_publications/);
  assert.match(source, /is_demo/);
});

test("las decisiones de publicacion estan protegidas por el rol estatal", async () => {
  const paths = [
    new URL("../../app/api/institutional/state/experiences/[reportId]/preview/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/experiences/[reportId]/publish/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/experiences/[reportId]/withdraw/route.ts", import.meta.url),
  ];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.match(source, /institutionalSessionOrError\(request, "state"\)/);
  }
});

test("publicar acepta el texto moderado y completa el flujo en una sola accion", async () => {
  const route = await readFile(new URL("../../app/api/institutional/state/experiences/[reportId]/publish/route.ts", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../../lib/experience-publication-db.ts", import.meta.url), "utf8");
  assert.match(route, /parseExperiencePreview/);
  assert.match(route, /publishExperiencePublication\(\{[\s\S]*preview/);
  assert.match(workflow, /if \(!input\.preview\)[\s\S]*facility_experience_publications/);
  assert.match(workflow, /SET status = 'published'/);
});

test("la bandeja presenta experiencias legibles sin JSON ni historial tecnico", async () => {
  const source = await readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8");
  assert.match(source, /Lista de/);
  assert.match(source, /Experiencia recibida/);
  assert.match(source, /Publicar experiencia/);
  assert.doesNotMatch(source, /Historial append-only|event_data|<pre>/);
});

test("el reset elimina publicaciones solamente a traves de expedientes demo", async () => {
  const source = await readFile(new URL("../../scripts/reset-demo-intake.mjs", import.meta.url), "utf8");
  assert.match(source, /DELETE FROM elepem_core\.facility_experience_publications/i);
  assert.match(source, /publication\.report_id = report\.id[\s\S]*report\.is_demo = true/i);
  assert.doesNotMatch(source, /DELETE FROM elepem_core\.facilities/i);
});

test("el portal ELEPEM usa la ficha canonica sin etiquetas de demostracion", async () => {
  const source = await readFile(new URL("../../app/institucional/elepem/page.tsx", import.meta.url), "utf8");
  assert.match(source, /loadAssignedFacilityProfiles/);
  assert.match(source, /Ver ficha pública/);
  assert.doesNotMatch(source, /Portal ELEPEM demo|Datos ficticios/i);
});
