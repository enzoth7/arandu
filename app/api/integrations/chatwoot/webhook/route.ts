import { NextResponse } from "next/server";
import { verifyChatwootWebhook } from "../../../../../lib/chatwoot-webhook-auth.mjs";
import { MAX_INTAKE_REQUEST_BYTES } from "../../../../../lib/intake-report.mjs";

export const runtime = "nodejs";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_INTAKE_REQUEST_BYTES) {
    return json({ error: "Solicitud demasiado extensa." }, 413);
  }

  // La firma cubre los bytes recibidos: no parsear ni reserializar antes de verificar.
  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_REQUEST_BYTES) {
    return json({ error: "Solicitud vacía o demasiado extensa." }, 413);
  }

  const verification = verifyChatwootWebhook({
    headers: request.headers,
    rawBody,
    secret: process.env.CHATWOOT_WEBHOOK_SECRET || "",
  });
  if (!verification.ok) return json({ error: verification.error }, verification.status);

  const workflowUrl = process.env.N8N_CHATWOOT_WEBHOOK_URL || "";
  const forwardSecret = process.env.N8N_CHATWOOT_FORWARD_SECRET || "";
  if (!workflowUrl || forwardSecret.length < 32) {
    return json({ error: "Entrega interna no configurada." }, 503);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  try {
    const response = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Alerta-Forward-Secret": forwardSecret,
        "X-Chatwoot-Timestamp": request.headers.get("x-chatwoot-timestamp") || "",
      },
      body: JSON.stringify(parsedBody),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return json({ error: "El workflow no aceptó el evento." }, 502);
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    console.error("Chatwoot webhook forwarding failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "No se pudo entregar el evento." }, 502);
  }
}
