import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function trackingEmailHtml(caseCode: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#17324d">
    <div style="max-width:560px;margin:auto;padding:28px;border-radius:16px;background:#ffffff">
      <p style="margin:0 0 8px;color:#153f3b;font-size:13px;font-weight:700;text-transform:uppercase">Arandú</p>
      <h1 style="margin:0 0 14px;font-size:24px">Tu comunicación fue recibida</h1>
      <p style="line-height:1.55">Guardá este código. Lo vas a necesitar para seguir el avance o hacer un reclamo:</p>
      <p style="padding:16px;border:2px solid #ebbd58;border-radius:12px;background:#fff9e9;font-family:monospace;font-size:20px;font-weight:700;text-align:center">${caseCode}</p>
      <p style="margin-top:18px;color:#5c7085;font-size:13px;line-height:1.5">Por privacidad, este correo no incluye el contenido de la comunicación.</p>
    </div>
  </body>
</html>`;
}

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Solicitud inválida." }, 400);
    }

    const record = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    const caseCode = typeof record.caseCode === "string" ? record.caseCode.trim().toUpperCase() : "";
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase().slice(0, 254) : "";
    const capabilityToken = typeof record.capabilityToken === "string" ? record.capabilityToken.trim() : "";
    if (!CASE_CODE_PATTERN.test(caseCode) || !EMAIL_PATTERN.test(email) || !CAPABILITY_TOKEN_PATTERN.test(capabilityToken)) {
      return json({ error: "Datos inválidos." }, 400);
    }

    const { data: report, error: reportError } = await ctx.supabaseAdmin
      .from("intake_reports")
      .select("id, report_payload")
      .eq("case_code", caseCode)
      .maybeSingle();

    const reportEmail = report?.report_payload && typeof report.report_payload === "object"
      && typeof (report.report_payload as Record<string, unknown>).contactEmail === "string"
      ? ((report.report_payload as Record<string, unknown>).contactEmail as string).trim().toLowerCase()
      : "";
    const storedCapabilityToken = report?.report_payload && typeof report.report_payload === "object"
      && typeof (report.report_payload as Record<string, unknown>).evidenceUploadToken === "string"
      ? (report.report_payload as Record<string, unknown>).evidenceUploadToken as string
      : "";

    if (reportError || !report || reportEmail !== email || storedCapabilityToken !== capabilityToken) {
      return json({ configured: Boolean(Deno.env.get("RESEND_API_KEY")), sent: false }, 202);
    }

    const { data: previousNotification } = await ctx.supabaseAdmin
      .from("intake_notification_log")
      .select("id")
      .eq("report_id", report.id)
      .eq("kind", "tracking_code_email")
      .maybeSingle();
    if (previousNotification) return json({ configured: true, sent: true, alreadySent: true });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return json({ configured: false, sent: false }, 202);

    const from = Deno.env.get("RESEND_FROM_EMAIL") || "Arandú <onboarding@resend.dev>";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Código de seguimiento ${caseCode}`,
        html: trackingEmailHtml(caseCode),
      }),
    });
    const resendResult: unknown = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok) {
      console.error("Resend rejected the tracking email.", { status: resendResponse.status });
      return json({ configured: true, sent: false }, 502);
    }

    const providerMessageId = resendResult && typeof resendResult === "object"
      && "id" in resendResult && typeof resendResult.id === "string"
      ? resendResult.id.slice(0, 240)
      : null;
    const { error: logError } = await ctx.supabaseAdmin.from("intake_notification_log").insert({
      report_id: report.id,
      kind: "tracking_code_email",
      provider_message_id: providerMessageId,
    });
    if (logError && logError.code !== "23505") {
      console.error("Could not record tracking email notification.", { code: logError.code });
    }

    return json({ configured: true, sent: true });
  }),
};
