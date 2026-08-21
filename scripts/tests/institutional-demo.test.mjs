import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { demoIntakeEnabled, parseExperienceSubmission, parseFacilityChangeSubmission } from "../../lib/demo-intake.mjs";

const validAnswers = { q01: "always", q05: "yes_completely", q30: "unable_to_evaluate" };

function validExperience(overrides = {}) {
  return {
    version: 5,
    facilityId: "REAL-123",
    privacyMode: "anonymous",
    contact: null,
    relationship: "family_referent_friend_neighbor",
    relationshipOther: null,
    respondentType: "family_or_close_person",
    residentParticipation: "jointly_discussed",
    narrative: "Una experiencia concreta para la revisión privada.",
    answers: validAnswers,
    requestedDestination: "private_review",
    publicationConsent: false,
    futureAuthorizations: { publicName: false, sendToFacility: false, shareContactWithFacility: false },
    consent: true,
    ...overrides,
  };
}

test("la recepción demo requiere las dos banderas", () => {
  assert.equal(demoIntakeEnabled({ DEMO_MODE: "true", DEMO_INTAKE_ENABLED: "true" }), true);
  assert.equal(demoIntakeEnabled({ DEMO_MODE: "true", DEMO_INTAKE_ENABLED: "false" }), false);
  assert.equal(demoIntakeEnabled({}), false);
});

test("la experiencia v5 guarda el cuestionario y los puntajes calculados por el servidor sin PII", () => {
  const parsed = parseExperienceSubmission(validExperience({
    privacyMode: "confidential",
    contact: { fullName: " Persona ", email: "PERSONA@example.com", phone: "" },
  }));
  assert.equal(parsed?.payload.facilityId, "REAL-123");
  assert.equal(parsed?.payload.version, 5);
  assert.equal(parsed?.payload.questionnaireVersion, "vcr1-30");
  assert.equal(parsed?.payload.scoringVersion, "vcr1-dimensions-1");
  assert.equal(parsed?.payload.privacyNoticeVersion, "vcr1-2026-08-17");
  assert.equal(parsed?.payload.publicationConsent, false);
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parsed?.payload.privacyMode, "confidential");
  assert.equal(parsed?.payload.dimensionResults.autonomy.average, 4);
  assert.equal(parsed?.payload.dimensionResults.contract.excludedCount, 1);
  assert.equal("contact" in (parsed?.payload || {}), false);
  assert.equal("period" in (parsed?.payload || {}), false);
  assert.equal(parsed?.contact?.name, "Persona");
  assert.equal(parsed?.contact?.email, "persona@example.com");
});

test("el contrato v5 rechaza aliases, versiones del cliente y respuestas desconocidas", () => {
  const withoutNarrative = validExperience();
  delete withoutNarrative.narrative;
  const withoutContact = validExperience();
  delete withoutContact.contact;
  assert.equal(parseExperienceSubmission(withoutNarrative), null);
  assert.equal(parseExperienceSubmission(withoutContact), null);
  assert.equal(parseExperienceSubmission(validExperience({ version: 4 })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacy: "Anónima" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ participation: "direct" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ period: "2022" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ questionnaireVersion: "vcr1-30" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ answers: { q31: "always" } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ answers: { q01: "yes_completely" } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ answers: {}, narrative: "   " })), null);
  assert.equal(parseExperienceSubmission(validExperience({ relationship: "other", relationshipOther: null })), null);
  assert.equal(parseExperienceSubmission(validExperience({ relationshipOther: "No corresponde" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ relationship: "other", relationshipOther: "Referente legal" }))?.payload.relationshipOther, "Referente legal");
});

test("destino, contacto y autorizaciones de envío se validan sin fallback", () => {
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "Anónima" })), null);
  assert.equal(parseExperienceSubmission(validExperience({ contact: { email: "persona@example.com" } })), null);
  const anonymousWithContact = parseExperienceSubmission(validExperience({ contact: { fullName: "Persona", phone: null, email: "persona@example.com" } }));
  assert.equal(anonymousWithContact?.contact, null);
  assert.equal("contact" in (anonymousWithContact?.payload || {}), false);
  assert.equal(parseExperienceSubmission(validExperience({ requestedDestination: "consider_anonymized", publicationConsent: false })), null);
  assert.equal(parseExperienceSubmission(validExperience({ requestedDestination: "consider_anonymized", publicationConsent: true }))?.payload.publicationConsent, true);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "confidential", contact: null, requestedDestination: "consider_anonymized", publicationConsent: true }))?.payload.publicationConsent, true);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "confidential", contact: null, publicationConsent: true })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "confidential", contact: null, futureAuthorizations: { publicName: true, sendToFacility: false, shareContactWithFacility: false } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "confidential", contact: { fullName: null, email: "persona@example.com" } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "registered_identity", contact: { fullName: null, phone: null, email: "persona@example.com" }, futureAuthorizations: { publicName: true, sendToFacility: false, shareContactWithFacility: false } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "registered_identity", contact: null, futureAuthorizations: { publicName: false, sendToFacility: true, shareContactWithFacility: true } })), null);
  assert.equal(parseExperienceSubmission(validExperience({ privacyMode: "confidential", contact: { fullName: "Persona", phone: null, email: null }, futureAuthorizations: { publicName: false, sendToFacility: false, shareContactWithFacility: true } })), null);
  const registered = parseExperienceSubmission(validExperience({
    privacyMode: "registered_identity",
    contact: { fullName: "Persona", phone: "+598 99 123 456", email: null },
    futureAuthorizations: { publicName: true, sendToFacility: true, shareContactWithFacility: true },
  }));
  assert.deepEqual(registered?.payload.futureAuthorizations, { publicName: true, sendToFacility: true, shareContactWithFacility: true });
  assert.deepEqual(registered?.contact, { name: "Persona", phone: "+598 99 123 456", email: null });
});

test("la experiencia breve elimina adjuntos, grabador y datos de contacto", async () => {
  const [experience, attachmentRoute] = await Promise.all([
    readFile(new URL("../../app/components/ExperienceForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/intake-reports/[caseCode]/attachments/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(experience, /Cinco secciones breves/);
  assert.match(experience, /publicación anónima después de la moderación/);
  assert.match(experience, /sendToFacility/);
  assert.match(experience, /shareContactWithFacility/);
  assert.doesNotMatch(experience, /PrivateAttachmentFields|uploadFiles|MediaRecorder|type="file"|Datos de contacto opcionales/);
  assert.doesNotMatch(attachmentRoute, /entry_type === "experience" && cleanType\.startsWith\("audio\/"\)/);
});

test("el formulario breve usa cinco pantallas, vínculo verificado y revisión final", async () => {
  const source = await readFile(new URL("../../app/components/ExperienceForm.tsx", import.meta.url), "utf8");
  assert.match(source, /Sección \{step \+ 1\} de 5/);
  assert.match(source, /relationship\.relationshipType === "resident"/);
  assert.match(source, /Omitir esta sección/);
  assert.match(source, /Revisá antes de enviar/);
  assert.match(source, /Enviar para revisión/);
  assert.doesNotMatch(source, /30 preguntas|residentParticipation|relationshipOther|type="file"/);
});

test("el cambio ELEPEM usa un ID real y limita fotos autorizadas", async () => {
  const parsed = parseFacilityChangeSubmission({ facilityId: 244, changes: { phones: ["2400 0002"] }, photoCount: 2, photoRightsConfirmed: true });
  assert.equal(parsed?.facilityId, 244);
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parseFacilityChangeSubmission({ facilityId: 244, changes: {}, photoCount: 11 }), null);
  assert.equal(parseFacilityChangeSubmission({ facilityId: 244, changes: {}, photoCount: 0 }), null);
  const source = await readFile(new URL("../../app/components/institutional/FacilityChangeForm.tsx", import.meta.url), "utf8");
  assert.match(source, /Fecha del precio/);
});

test("las fotos propuestas comparten una sola procedencia y declaración de derechos", async () => {
  const source = await readFile(new URL("../../app/components/institutional/FacilityChangeForm.tsx", import.meta.url), "utf8");
  assert.match(source, /Procedencia de las fotos/);
  assert.match(source, /rightsSource/);
  assert.match(source, /rightsConfirmed/);
  assert.match(source, /Confirmo que tengo autorización y derechos/);
  assert.doesNotMatch(source, /supporting_document|documentos de respaldo/);
});

test("sólo la aprobación institucional escribe en el padrón canónico", async () => {
  const paths = [
    new URL("../../app/api/experiences/route.ts", import.meta.url),
    new URL("../../app/api/institutional/facility/requests/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/decisions/route.ts", import.meta.url),
    new URL("../../lib/demo-intake-db.ts", import.meta.url),
    new URL("../../lib/experience-publication-db.ts", import.meta.url),
  ];
  const source = (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?residenciales/i);
  assert.match(source, /UPDATE public\.elepem SET/);
  assert.match(source, /institutional_facility_change_approved/);
  assert.match(source, /facility_experience_publications/);
  assert.match(source, /is_demo/);
});

test("las fotos ELEPEM sólo se publican tras aprobación estatal explícita", async () => {
  const [decisionRoute, publicPhotoRoute, inbox] = await Promise.all([
    readFile(new URL("../../app/api/institutional/state/decisions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/residenciales/[facilityKey]/photos/[photoId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(decisionRoute, /action === "approve"/);
  assert.match(decisionRoute, /facility_change_publications/);
  assert.match(decisionRoute, /rights_metadata->>'rightsConfirmed' = 'true'/);
  assert.doesNotMatch(publicPhotoRoute, /institutionalSessionOrError/);
  assert.match(publicPhotoRoute, /facility_change_publication_photos/);
  assert.match(publicPhotoRoute, /publication_batch_id/);
  assert.match(publicPhotoRoute, /rightsConfirmed/);
  assert.match(decisionRoute, /facility_change_publications/);
  assert.match(inbox, /Aprobar cambios/);
});

test("las propuestas ELEPEM usan borrador privado y finalización con evidencia", async () => {
  const route = await readFile(new URL("../../app/api/institutional/facility/requests/route.ts", import.meta.url), "utf8");
  const attachment = await readFile(new URL("../../app/api/intake-reports/[caseCode]/attachments/route.ts", import.meta.url), "utf8");
  assert.match(route, /mode === "finalize"/);
  assert.match(route, /current_status = 'draft'/);
  assert.match(route, /submitted_by_user_id/);
  assert.match(attachment, /La carga privada de fotos no está configurada en este entorno/);
  assert.match(attachment, /máximo de 10 fotos/);
  assert.match(route, /rightsConfirmed/);
});

test("la revisión documental interna es append-only y no crea una proyección pública", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/20260812090000_add_private_facility_document_reviews.sql", import.meta.url), "utf8");
  assert.match(migration, /facility_document_status_reviews/);
  assert.match(migration, /append-only/);
  assert.match(migration, /decision in \('inadequate', 'clear'\)/);
  assert.doesNotMatch(migration, /public\.residenciales|update\s+elepem_core\.facilities/i);
});

test("las decisiones de publicacion estan protegidas por el rol estatal", async () => {
  const paths = [
    new URL("../../app/api/institutional/state/experiences/[reportId]/preview/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/experiences/[reportId]/publish/route.ts", import.meta.url),
    new URL("../../app/api/institutional/state/experiences/[reportId]/withdraw/route.ts", import.meta.url),
  ];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.match(source, /institutionalSessionOrError\(request, "moderator"\)/);
  }
});

test("publicar acepta el texto moderado y completa el flujo en una sola accion", async () => {
  const route = await readFile(new URL("../../app/api/institutional/state/experiences/[reportId]/publish/route.ts", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../../lib/experience-publication-db.ts", import.meta.url), "utf8");
  assert.match(route, /parseExperiencePreview/);
  assert.match(route, /publishExperiencePublication\(\{[\s\S]*preview/);
  assert.match(workflow, /if \(!preview\)[\s\S]*facility_experience_publications/);
  assert.match(workflow, /SET status = 'published'/);
});

test("las experiencias usan exactamente una referencia real o demo tras el corte ELEPEM", async () => {
  const workflow = await readFile(new URL("../../lib/experience-publication-db.ts", import.meta.url), "utf8");
  assert.match(workflow, /SELECT id, entry_type, is_demo, facility_id::text, demo_facility_id/);
  assert.match(workflow, /report_id, facility_id, demo_facility_id/);
  assert.match(workflow, /Boolean\(report\.facility_id\) === Boolean\(report\.demo_facility_id\)/);
  assert.match(workflow, /facility_id IS NOT DISTINCT FROM \$2::bigint/);
  assert.match(workflow, /demo_facility_id IS NOT DISTINCT FROM \$3/);
});

test("la bandeja presenta experiencias legibles sin JSON ni historial tecnico", async () => {
  const source = await readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8");
  assert.match(source, /Lista de/);
  assert.match(source, /Experiencia recibida/);
  assert.match(source, /Confirmar publicación/);
  assert.doesNotMatch(source, /Historial append-only|<pre>/);
});

test("la bandeja v5 separa resultados y autorizaciones privadas de la publicacion moderada", async () => {
  const source = await readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8");
  assert.match(source, /EXPERIENCE_DIMENSIONS\.map/);
  assert.match(source, /Respuestas y resultados privados/);
  assert.match(source, /Autorizaciones privadas/);
  assert.match(source, /contacts\[0\]\?\.name/);
  assert.match(source, /futureAuthorizations\.sendToFacility === true/);
  assert.match(source, /publicBody: report\.publication\?\.publicBody \|\| ""/);
  assert.match(source, /!isV5Experience\(selected\)[\s\S]*Período/);
});

test("la bandeja unifica entradas y etiqueta cada tipo", async () => {
  const source = await readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8");
  assert.match(source, /KIND_LABELS/);
  assert.match(source, /reports\.map\(\(report\)/);
  assert.match(source, /Solicitud de cambio/);
  assert.doesNotMatch(source, /const TABS|reports\.filter\(\(report\) => report\.entry_type/);
});

test("el triaje conserva las cuatro verificaciones auditables", async () => {
  const [inbox, route] = await Promise.all([
    readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/institutional/state/decisions/route.ts", import.meta.url), "utf8"),
  ]);
  for (const key of ["immediateDangerReviewed", "safeContactRecorded", "relatedCasesSearched", "personWillRecorded"]) {
    assert.match(inbox, new RegExp(key));
    assert.match(route, new RegExp(key));
  }
  assert.match(inbox, /event\.event_data\?\.triage/);
  assert.match(route, /JSON\.stringify\(\{ decision: action, triage, userId/);
});

test("la decisión de experiencias distingue publicar de no publicar", async () => {
  const source = await readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8");
  assert.match(source, />Publicar<\/button>/);
  assert.match(source, />No publicar<\/button>/);
  assert.match(source, /!canPublishExperience\(selected\)/);
  assert.match(source, /private_facility[\s\S]*private_review/);
  assert.match(source, /La publicación nunca es automática/);
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
  assert.doesNotMatch(source, /Ver ficha pública/);
  assert.doesNotMatch(source, /Portal ELEPEM demo|Datos ficticios/i);
});

test("los precios sintéticos conservados se identifican explícitamente como demo", async () => {
  const source = await readFile(new URL("../../lib/facility-registry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /demoPriceEnabled|DEMO_MODE/);
  assert.match(source, /registry\.precio_es_demo/);
  assert.match(source, /monthlyPriceUyu: row\.precio_mensual_uyu/);
  assert.match(source, /priceIsDemo: row\.precio_es_demo/);
});

test("la ficha muestra cualquier experiencia moderada y publicada", async () => {
  const source = await readFile(new URL("../../app/api/residenciales/[facilityKey]/experiencias/route.ts", import.meta.url), "utf8");
  assert.match(source, /facility_experiences_published/);
  assert.doesNotMatch(source, /DEMO_MODE|AND is_demo/);
});
