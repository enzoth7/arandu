import { NextResponse } from "next/server";
import { demoIntakeEnabled, parseExperienceSubmission } from "../../../lib/demo-intake.mjs";
import { insertDemoIntake } from "../../../lib/demo-intake-db";
import { MAX_INTAKE_REQUEST_BYTES } from "../../../lib/intake-report.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!demoIntakeEnabled()) {
    return NextResponse.json({ error: "La recepción demo está desactivada." }, { status: 503 });
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_INTAKE_REQUEST_BYTES) {
    return NextResponse.json({ error: "La experiencia es demasiado extensa." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la experiencia." }, { status: 400 });
  }
  const parsed = parseExperienceSubmission(body);
  if (!parsed) {
    return NextResponse.json({ error: "Revisá los campos obligatorios." }, { status: 400 });
  }

  try {
    const result = await insertDemoIntake({
      kind: "experience",
      submittedActor: "public",
      demoFacilityId: parsed.payload.facilityId,
      payload: parsed.payload,
      contact: parsed.contact,
    });
    return NextResponse.json({
      caseCode: result.caseCode,
      message: "La experiencia quedó en revisión humana. No se publicó ningún contenido.",
    }, { status: 201 });
  } catch (error) {
    console.error("Experience intake failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la experiencia." }, { status: 502 });
  }
}
