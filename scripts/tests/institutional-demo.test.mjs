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

test("la experiencia sólo exige ELEPEM y consentimiento y conserva el período por años", () => {
  const parsed = parseExperienceSubmission({ facilityId: "REAL-123", relationship: "Familiar", periodStartYear: "2022", periodEndYear: "2024", answers: validAnswers, requestedDestination: "private_review", publicationConsent: false, privacy: "Confidencial", consent: true, contact: { email: "persona@example.com" } });
  assert.equal(parsed?.payload.facilityId, "REAL-123");
  assert.equal(parsed?.payload.version, 4);
  assert.equal(parsed?.payload.publicationConsent, false);
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parsed?.payload.period, "De 2022 a 2024");
  assert.equal(parsed?.payload.privacy, "Confidencial");
  assert.equal(parsed?.contact?.email, "persona@example.com");
  const sparse = parseExperienceSubmission({ facilityId: "REAL-123", consent: true });
  assert.equal(sparse?.payload.requestedDestination, "private_review");
  assert.equal(sparse?.payload.privacy, "Anónima");
  assert.equal(sparse?.contact, null);
  assert.equal(sparse?.payload.period, null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", privacy: "Anónima", contact: { email: "persona@example.com" }, consent: true })?.contact, null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", periodStartYear: "2025", periodEndYear: "2022", consent: true }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "", consent: true }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", consent: false }), null);
  assert.equal(parseExperienceSubmission({ facilityId: "REAL-123", requestedDestination: "consider_anonymized", publicationConsent: false, consent: true })?.payload.requestedDestination, "private_review");
});

test("experiencia y preocupación ofrecen relato, voz y archivos privados en el primer paso", async () => {
  const [experience, concern, sharedBlock, privateAttachments, attachmentRoute] = await Promise.all([
    readFile(new URL("../../app/components/ExperienceForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/IntakeReportForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/PrivacyContactBlock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/PrivateAttachmentFields.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/intake-reports/[caseCode]/attachments/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(experience, /<PrivacyContactBlock/);
  assert.match(experience, /Sólo revisión estatal privada/);
  assert.doesNotMatch(experience, /Resumen agregado/);
  assert.match(concern, /<PrivacyContactBlock/);
  assert.match(sharedBlock, /Anónima/);
  assert.match(sharedBlock, /Confidencial/);
  assert.match(sharedBlock, /Con identidad registrada/);
  assert.match(experience, /\{step === 1[\s\S]*<PrivateAttachmentFields[\s\S]*\{step === 2/);
  assert.match(experience, /\{step === 1[\s\S]*Contá brevemente qué pasó[\s\S]*\{step === 2/);
  assert.match(concern, /\{step === 1[\s\S]*<PrivateAttachmentFields[\s\S]*\{step === 2/);
  assert.match(concern, /\{step === 1[\s\S]*Contá brevemente qué está pasando[\s\S]*\{step === 2/);
  assert.match(privateAttachments, /privateNarrativeComposer/);
  assert.match(privateAttachments, /TOCÁ/);
  assert.match(privateAttachments, /Adjuntar archivo/);
  assert.match(privateAttachments, /Hasta 5 archivos privados en total/);
  assert.doesNotMatch(privateAttachments, /Archivos privados \(opcionales\)|Podés adjuntar imágenes, audios o documentos para la revisión\./);
  assert.match(privateAttachments, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(privateAttachments, /new MediaRecorder/);
  assert.doesNotMatch(experience, /accept="image\/jpeg|Imágenes privadas|sólo admiten imágenes privadas/);
  assert.doesNotMatch(attachmentRoute, /entry_type === "experience" && cleanType\.startsWith\("audio\/"\)/);
});

test("el cambio ELEPEM no exige fecha y limita fotos privadas", async () => {
  const parsed = parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", changes: { phone: "+598 000 002" }, photoCount: 2 });
  assert.equal(parsed?.facilityId, "DEMO-ELEPEM-002");
  assert.equal(parsed?.payload.publication, "never_automatic");
  assert.equal(parsed?.payload.needsSupportingDocument, true);
  assert.equal(parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", changes: {}, photoCount: 11 }), null);
  assert.equal(parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", changes: {}, photoCount: 0 }), null);
  const removal = parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-002", changes: {}, photoCount: 0, removeCurrentPhoto: true });
  assert.equal(removal?.payload.removeCurrentPhoto, true);
  const source = await readFile(new URL("../../app/components/institutional/FacilityChangeForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Fecha de vigencia del dato/);
});

test("las fotos propuestas comparten una sola procedencia y declaración de derechos", async () => {
  const source = await readFile(new URL("../../app/components/institutional/FacilityChangeForm.tsx", import.meta.url), "utf8");
  assert.match(source, /facilityProposedPhotoGrid/);
  assert.match(source, /Procedencia de las fotos/);
  assert.match(source, /rightsSource", photoSource/);
  assert.match(source, /rightsConfirmed", String\(photoRightsConfirmed\)/);
  assert.match(source, /aria-label={`Quitar foto \$\{index \+ 1\}`}/);
  assert.match(source, /Editar fotos/);
  assert.match(source, /Foto publicada actualmente/);
  assert.match(source, /Quitar foto publicada/);
  assert.doesNotMatch(source, /Proponer fotos/);
  assert.doesNotMatch(source, /Procedencia de esta foto/);
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

test("las fotos ELEPEM sólo se publican tras aprobación estatal explícita", async () => {
  const [decisionRoute, publicPhotoRoute, inbox] = await Promise.all([
    readFile(new URL("../../app/api/institutional/state/decisions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/residenciales/[facilityKey]/photos/[photoId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/institutional/StateInbox.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(decisionRoute, /action === "approve_preview"/);
  assert.match(decisionRoute, /facility_change_publications/);
  assert.match(decisionRoute, /rights_metadata->>'rightsConfirmed' = 'true'/);
  assert.doesNotMatch(publicPhotoRoute, /institutionalSessionOrError/);
  assert.match(publicPhotoRoute, /facility_change_publication_photos/);
  assert.match(publicPhotoRoute, /rightsConfirmed/);
  assert.match(inbox, /Aprobar y publicar fotos/);
});

test("las propuestas ELEPEM usan borrador privado y finalización con evidencia", async () => {
  const route = await readFile(new URL("../../app/api/institutional/facility/requests/route.ts", import.meta.url), "utf8");
  const attachment = await readFile(new URL("../../app/api/intake-reports/[caseCode]/attachments/route.ts", import.meta.url), "utf8");
  assert.match(route, /mode === "finalize"/);
  assert.match(route, /current_status = 'draft'/);
  assert.match(route, /needsSupportingDocument/);
  assert.match(attachment, /La carga privada de fotos y documentos no está configurada en este entorno/);
  assert.match(attachment, /máximo de 10 fotos/);
  assert.match(attachment, /supporting_document/);
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
  assert.doesNotMatch(source, /Ver ficha pública/);
  assert.doesNotMatch(source, /Portal ELEPEM demo|Datos ficticios/i);
});

test("los precios publicados se limitan a MSP o MIDES salvo la referencia demo explicita", async () => {
  const source = await readFile(new URL("../../lib/facility-registry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /demoPriceEnabled|DEMO_MODE/);
  assert.match(source, /row\.is_demo \|\| row\.msp_final \|\| row\.mides_social/);
  assert.match(source, /monthlyPriceUyu,/);
});

test("la ficha muestra cualquier experiencia moderada y publicada", async () => {
  const source = await readFile(new URL("../../app/api/residenciales/[facilityKey]/experiencias/route.ts", import.meta.url), "utf8");
  assert.match(source, /facility_experiences_published/);
  assert.doesNotMatch(source, /DEMO_MODE|AND is_demo/);
});
