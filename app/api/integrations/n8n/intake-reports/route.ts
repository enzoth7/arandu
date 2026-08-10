import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildReportPayload,
  isRecord,
  intakeText,
  intakeTextList,
  MAX_INTAKE_REQUEST_BYTES,
  newCaseCode,
  newUploadToken,
} from "../../../../../lib/intake-report.mjs";
import { verifyN8nIntakeRequest } from "../../../../../lib/n8n-intake-auth.mjs";
import { withSupabaseTransaction } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseChatwoot(value: unknown) {
  if (!isRecord(value)) return null;
  const accountId = intakeText(value.accountId, 100);
  const inboxId = intakeText(value.inboxId, 100);
  const conversationId = intakeText(value.conversationId, 100);
  const contactId = intakeText(value.contactId, 100);
  const phone = intakeText(value.phone, 24);
  const messageIds = intakeTextList(value.messageIds, 100, 100);
  if (!accountId || !inboxId || !conversationId || !contactId || !phone) return null;
  return { accountId, inboxId, conversationId, contactId, phone, messageIds };
}

function parseConsent(value: unknown) {
  if (!isRecord(value)) return null;
  const mode = intakeText(value.mode, 40);
  const noticeVersion = intakeText(value.noticeVersion, 80);
  const acceptedAt = intakeText(value.acceptedAt, 50);
  const parsedAcceptedAt = Date.parse(acceptedAt);
  if (
    !["Confidencial", "Con identidad registrada"].includes(mode)
    || noticeVersion !== "whatsapp-sandbox-v2"
    || !Number.isFinite(parsedAcceptedAt)
  ) return null;
  return { mode, noticeVersion, acceptedAt: new Date(parsedAcceptedAt).toISOString() };
}

function parseConfirmation(value: unknown) {
  if (!isRecord(value)) return null;
  const method = intakeText(value.method, 40);
  const phraseVersion = intakeText(value.phraseVersion, 80);
  const confirmedAt = intakeText(value.confirmedAt, 50);
  const parsedConfirmedAt = Date.parse(confirmedAt);
  if (method !== "explicit_phrase" || phraseVersion !== "whatsapp-sandbox-v2" || !Number.isFinite(parsedConfirmedAt)) return null;
  return { method, phraseVersion, confirmedAt: new Date(parsedConfirmedAt).toISOString() };
}

function parseRequiredWhatsappFields(value: unknown, privacy: string) {
  if (!isRecord(value)) return null;
  const facility = isRecord(value.facility) ? value.facility : {};
  const reporterName = intakeText(value.reporterName, 160);
  const complete = ["Alta", "Media", "Baja"].includes(intakeText(value.preliminaryPriority, 32))
    && intakeTextList(value.risks).length > 0
    && intakeTextList(value.concerns).length > 0
    && Boolean(intakeText(value.narrative, 6_000))
    && Boolean(intakeText(facility.name, 300))
    && Boolean(intakeText(value.safeContact, 1_000))
    && typeof value.noEarlyContact === "boolean";
  if (!complete || (privacy === "Con identidad registrada" && !reporterName)) return null;
  return { reporterName: reporterName || null };
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_INTAKE_REQUEST_BYTES) return json({ error: "Solicitud demasiado extensa." }, 413);

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_REQUEST_BYTES) {
    return json({ error: "Solicitud vacía o demasiado extensa." }, 413);
  }

  const auth = verifyN8nIntakeRequest({
    headers: request.headers,
    rawBody,
    secret: process.env.N8N_INTAKE_HMAC_SECRET || "",
  });
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  if (!isRecord(body) || body.source !== "whatsapp_sandbox" || body.isSandbox !== true) {
    return json({ error: "Este ingreso admite únicamente el sandbox de WhatsApp." }, 400);
  }

  const externalEventId = intakeText(body.externalEventId, 200);
  const chatwoot = parseChatwoot(body.chatwoot);
  const consent = parseConsent(body.consent);
  const confirmation = parseConfirmation(body.confirmation);
  const payload = buildReportPayload(body.report, { source: "whatsapp_sandbox", isSandbox: true });
  const requiredWhatsappFields = parseRequiredWhatsappFields(body.report, consent?.mode || "");
  const consentAt = consent ? Date.parse(consent.acceptedAt) : 0;
  const confirmedAt = confirmation ? Date.parse(confirmation.confirmedAt) : 0;
  const confirmationIsFresh = confirmedAt > 0 && Math.abs(Date.now() - confirmedAt) <= 5 * 60_000;
  const consentPrecedesConfirmation = consentAt > 0 && consentAt <= confirmedAt && confirmedAt - consentAt <= 24 * 60 * 60_000;
  if (!externalEventId || !chatwoot || !consent || !confirmation || !requiredWhatsappFields || !confirmationIsFresh || !consentPrecedesConfirmation || !payload || payload.privacy !== consent.mode) {
    return json({ error: "Faltan datos requeridos o el consentimiento no coincide." }, 400);
  }
  const { contactPhone, contactEmail, reporterName, ...contentPayload } = payload;

  const phonePepper = process.env.INTAKE_PHONE_HASH_PEPPER || "";
  if (phonePepper.length < 32) return json({ error: "La correlación técnica no está configurada." }, 503);
  const phoneHash = createHash("sha256")
    .update(`${phonePepper}:${chatwoot.phone}`)
    .digest("hex");

  try {
    const result = await withSupabaseTransaction(async (client) => {
      // Serialize requests sharing an idempotency key so two webhook retries cannot
      // create two reports before the unique idempotency row exists.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [auth.idempotencyKey]);
      const existing = await client.query<{
        request_hash: string;
        case_code: string;
        report_payload: Record<string, unknown>;
      }>(
        `SELECT request.request_hash, report.case_code, report.report_payload
         FROM public.intake_ingestion_requests AS request
         JOIN public.intake_reports AS report ON report.id = request.report_id
         WHERE request.idempotency_key = $1
         LIMIT 1`,
        [auth.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== auth.requestHash) return { conflict: true as const };
        const token = typeof existing.rows[0].report_payload.evidenceUploadToken === "string"
          ? existing.rows[0].report_payload.evidenceUploadToken
          : "";
        return { duplicate: true as const, caseCode: existing.rows[0].case_code, uploadToken: token };
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const caseCode = newCaseCode();
        const uploadToken = newUploadToken();
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO public.intake_reports (
             case_code, source, priority, department, report_payload,
             entry_type, is_demo, payload_version, submitted_actor
           )
           VALUES ($1, 'whatsapp_sandbox', $2, $3, $4::jsonb, 'concern', true, 2, 'system')
           ON CONFLICT (case_code) DO NOTHING
           RETURNING id`,
          [
            caseCode,
            payload.preliminaryPriority,
            isRecord(payload.location) ? payload.location.department : null,
            JSON.stringify({
                ...contentPayload,
                consent: { ...consent, transport: "whatsapp" },
                confirmation,
                evidenceUploadToken: uploadToken,
            }),
          ],
        );
        const reportId = inserted.rows[0]?.id;
          if (!reportId) continue;
          if (reporterName || contactPhone || contactEmail) {
            await client.query(
              `INSERT INTO public.intake_report_contacts (report_id, name, phone, email)
               VALUES ($1, $2, $3, $4)`,
              [reportId, reporterName || null, contactPhone || null, contactEmail || null],
            );
          }
          await client.query(
            `INSERT INTO public.intake_channel_links (
               report_id, source, external_account_id, external_inbox_id,
               external_conversation_id, external_contact_id, external_message_ids,
               phone_hash, reporter_display_name, consent_mode, consent_notice_version, consented_at,
               retention_due_at, sandbox_purge_due_at, is_sandbox
             ) VALUES ($1, 'whatsapp_sandbox', $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, now() + interval '7 days', now() + interval '30 days', true)`,
            [reportId, chatwoot.accountId, chatwoot.inboxId, chatwoot.conversationId, chatwoot.contactId, JSON.stringify(chatwoot.messageIds), phoneHash, requiredWhatsappFields.reporterName, consent.mode, consent.noticeVersion, consent.acceptedAt],
          );
          await client.query(
            `INSERT INTO public.intake_ingestion_requests (idempotency_key, request_hash, report_id, external_event_id)
             VALUES ($1, $2, $3, $4)`,
            [auth.idempotencyKey, auth.requestHash, reportId, externalEventId],
          );
          return { duplicate: false as const, caseCode, uploadToken };
      }
      throw new Error("case-code-exhausted");
    });

    if ("conflict" in result) return json({ error: "La clave de idempotencia ya fue usada con otro contenido." }, 409);
    return json({ caseCode: result.caseCode, uploadToken: result.uploadToken, duplicate: result.duplicate }, result.duplicate ? 200 : 201);
  } catch (error) {
    console.error("n8n intake integration failed.", { message: error instanceof Error ? error.message : "unknown" });
    return json({ error: "No se pudo crear el expediente de sandbox." }, 502);
  }
}
