import { NextResponse } from "next/server";
import { demoIntakeEnabled, DEMO_FACILITY_ID_PATTERN } from "../../../lib/demo-intake.mjs";
import { insertDemoIntake } from "../../../lib/demo-intake-db";
import { buildReportPayload, isRecord, MAX_INTAKE_REQUEST_BYTES, PUBLIC_CONCERN_INITIAL_PRIORITY } from "../../../lib/intake-report.mjs";
import { demoFacilityExists, resolvePublicFacilityReference } from "../../../lib/facility-registry";

export const runtime = "nodejs";

function supabaseHeaders(publishableKey: string): Record<string, string> {
  return {
    apikey: publishableKey,
    ...(publishableKey.split(".").length === 3 ? { Authorization: `Bearer ${publishableKey}` } : {}),
  };
}

async function requestTrackingEmail(caseCode: string, contactEmail: string, capabilityToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return { sent: false, configured: false };
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-intake-code`, {
      method: "POST",
      headers: { ...supabaseHeaders(publishableKey), "Content-Type": "application/json" },
      body: JSON.stringify({ caseCode, email: contactEmail, capabilityToken }),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    return {
      sent: response.ok && Boolean(result && typeof result === "object" && "sent" in result && result.sent === true),
      configured: Boolean(result && typeof result === "object" && "configured" in result && result.configured === true),
    };
  } catch (error) {
    console.error("Tracking email function request failed.", { message: error instanceof Error ? error.message : "unknown" });
    return { sent: false, configured: false };
  }
}

export async function POST(request: Request) {
  if (!demoIntakeEnabled()) {
    return NextResponse.json({ error: "La recepción demo está desactivada." }, { status: 503 });
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_INTAKE_REQUEST_BYTES) {
    return NextResponse.json({ error: "La comunicación es demasiado extensa." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la comunicación." }, { status: 400 });
  }
  const payload = buildReportPayload(isRecord(body) ? body.report : null);
  if (!payload || JSON.stringify(payload).length > MAX_INTAKE_REQUEST_BYTES) {
    return NextResponse.json({ error: "Faltan datos requeridos o la comunicación es demasiado extensa." }, { status: 400 });
  }

  const { contactEmail, contactPhone, reporterName, ...content } = payload;
  const facility = isRecord(payload.facility) ? payload.facility : {};
  const location = isRecord(payload.location) ? payload.location : {};
  const requestedFacilityId = typeof facility.id === "string" ? facility.id : "";
  const demoFacilityId = DEMO_FACILITY_ID_PATTERN.test(requestedFacilityId) ? requestedFacilityId : null;
  const resolvedFacility = demoFacilityId ? null : await resolvePublicFacilityReference(requestedFacilityId);
  if (demoFacilityId ? !await demoFacilityExists(demoFacilityId) : !resolvedFacility) {
    return NextResponse.json({ error: "El ELEPEM seleccionado no pertenece al padrón disponible." }, { status: 400 });
  }
  const contact = contactEmail || contactPhone || reporterName
    ? { name: typeof reporterName === "string" ? reporterName : null, phone: typeof contactPhone === "string" ? contactPhone : null, email: typeof contactEmail === "string" ? contactEmail : null }
    : null;
  try {
    const result = await insertDemoIntake({
      kind: "concern",
      submittedActor: "public",
      demoFacilityId,
      facilityId: resolvedFacility?.id || null,
      priority: PUBLIC_CONCERN_INITIAL_PRIORITY,
      department: resolvedFacility?.department || (typeof location.department === "string" ? location.department : null),
      payload: { ...content, version: 2, publication: "never_automatic" },
      contact,
    });
    const emailNotification = contact?.email
      ? await requestTrackingEmail(result.caseCode, contact.email, result.uploadToken)
      : null;
    return NextResponse.json({ caseCode: result.caseCode, uploadToken: result.uploadToken, emailNotification }, { status: 201 });
  } catch (error) {
    console.error("Demo concern intake failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la comunicación." }, { status: 502 });
  }
}
