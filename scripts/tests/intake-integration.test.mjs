import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReportPayload,
  evidenceSignatureMatches,
  newCaseCode,
  newUploadToken,
  sameSecret,
} from "../../lib/intake-report.mjs";
import { integrationSignature, verifyN8nIntakeRequest } from "../../lib/n8n-intake-auth.mjs";
import { chatwootSignature, verifyChatwootWebhook } from "../../lib/chatwoot-webhook-auth.mjs";

const sandboxReport = {
  setting: "En un residencial / ELEPEM",
  reporter: "Familiar o referente",
  channel: "WhatsApp sandbox",
  concerns: ["Riesgo o irregularidad en un residencial"],
  narrative: "Caso completamente ficticio para probar el flujo.",
  location: { department: "Montevideo", reference: "Dirección ficticia 123" },
  facility: { name: "Residencial ficticio" },
  privacy: "Confidencial",
  contactPhone: "099 000 000",
  preliminaryPriority: "Media",
};

test("normaliza un expediente de WhatsApp sandbox con versión 2", () => {
  const payload = buildReportPayload(sandboxReport, {
    source: "whatsapp_sandbox",
    isSandbox: true,
    now: new Date("2026-08-04T15:00:00.000Z"),
  });
  assert.ok(payload);
  assert.equal(payload.version, 2);
  assert.equal(payload.source, "whatsapp_sandbox");
  assert.equal(payload.isSandbox, true);
  assert.equal(payload.setting, "En un residencial / ELEPEM");
});

test("rechaza anonimato y casos fuera de ELEPEM en WhatsApp", () => {
  assert.equal(buildReportPayload({ ...sandboxReport, privacy: "Anónima" }, { source: "whatsapp_sandbox", isSandbox: true }), null);
  assert.equal(buildReportPayload({ ...sandboxReport, setting: "En su casa o comunidad" }, { source: "whatsapp_sandbox", isSandbox: true }), null);
});

test("el contrato web exige consentimiento y un ELEPEM del padrón", () => {
  const webReport = {
    ...sandboxReport,
    reporter: "No indicado",
    privacy: "Anónima",
    location: { department: "Montevideo", reference: "ELEPEM ficticio \u00b7 Montevideo" },
    facility: { id: "REAL-123", name: "ELEPEM ficticio" },
    consent: true,
  };
  const payload = buildReportPayload(webReport);
  assert.ok(payload);
  assert.equal(payload.version, 1);
  assert.equal(payload.source, "web");
  assert.equal(buildReportPayload({ ...webReport, consent: false }), null);
  assert.equal(buildReportPayload({ ...webReport, facility: { name: "Sin identificador" } }), null);
});

test("genera código y token con formatos estables", () => {
  const code = newCaseCode(new Date("2026-08-04T00:00:00.000Z"), new Uint8Array([0, 1, 254, 255]));
  assert.equal(code, "AM-20260804-0001FEFF");
  assert.match(newUploadToken(new Uint8Array(24)), /^[A-Za-z0-9_-]{32}$/);
});

test("verifica HMAC, ventana temporal e idempotencia", () => {
  const secret = "sandbox-secret-with-at-least-32-characters";
  const now = Date.parse("2026-08-04T15:00:00.000Z");
  const timestamp = String(now);
  const nonce = "nonce_1234567890abcdef";
  const idempotencyKey = "chatwoot:delivery:123456789";
  const rawBody = JSON.stringify({ source: "whatsapp_sandbox" });
  const headers = new Headers({
    "x-alerta-timestamp": timestamp,
    "x-alerta-nonce": nonce,
    "x-alerta-idempotency-key": idempotencyKey,
    "x-alerta-signature": integrationSignature(secret, timestamp, nonce, idempotencyKey, rawBody),
  });
  const result = verifyN8nIntakeRequest({ headers, rawBody, secret, now });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.idempotencyKey, idempotencyKey);

  headers.set("x-alerta-signature", "sha256=00");
  assert.equal(verifyN8nIntakeRequest({ headers, rawBody, secret, now }).ok, false);
  headers.set("x-alerta-signature", integrationSignature(secret, timestamp, nonce, idempotencyKey, rawBody));
  assert.equal(verifyN8nIntakeRequest({ headers, rawBody, secret, now: now + 300_001 }).ok, false);
});

test("valida firmas reales y rechaza MIME fingido", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
  assert.equal(evidenceSignatureMatches(png, "image/png"), true);
  assert.equal(evidenceSignatureMatches(Buffer.from("not an image"), "image/png"), false);
  assert.equal(evidenceSignatureMatches(Buffer.from("relato ficticio"), "text/plain"), true);
  assert.equal(evidenceSignatureMatches(Buffer.from([0, 1, 2]), "text/plain"), false);
});

test("compara tokens sin revelar su longitud o contenido", () => {
  assert.equal(sameSecret("token-a", "token-a"), true);
  assert.equal(sameSecret("token-a", "token-b"), false);
  assert.equal(sameSecret("short", "a-much-longer-value"), false);
});

test("verifica la firma Chatwoot sobre timestamp y cuerpo crudo", () => {
  const secret = "chatwoot-secret-with-at-least-32-characters";
  const now = Date.parse("2026-08-04T15:00:00.000Z");
  const timestamp = String(Math.floor(now / 1_000));
  const rawBody = '{"event":"message_created","content":"ficticio"}';
  const headers = new Headers({
    "x-chatwoot-timestamp": timestamp,
    "x-chatwoot-signature": chatwootSignature(secret, timestamp, rawBody),
  });
  assert.equal(verifyChatwootWebhook({ headers, rawBody, secret, now }).ok, true);

  const reformatted = JSON.stringify(JSON.parse(rawBody), null, 2);
  assert.equal(verifyChatwootWebhook({ headers, rawBody: reformatted, secret, now }).ok, false);
  headers.set("x-chatwoot-signature", "sha256=00");
  assert.equal(verifyChatwootWebhook({ headers, rawBody, secret, now }).ok, false);
  headers.set("x-chatwoot-signature", chatwootSignature(secret, timestamp, rawBody));
  assert.equal(verifyChatwootWebhook({ headers, rawBody, secret, now: now + 300_001 }).ok, false);
});
