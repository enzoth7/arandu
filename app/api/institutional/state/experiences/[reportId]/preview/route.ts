import { NextRequest, NextResponse } from "next/server";
import { parseExperiencePreview } from "../../../../../../../lib/experience-publications.mjs";
import {
  ExperiencePublicationWorkflowError,
  saveExperiencePublicationPreview,
} from "../../../../../../../lib/experience-publication-db";
import { institutionalSessionOrError } from "../../../../../../../lib/institutional-auth";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PREVIEW_REQUEST_BYTES = 8_192;

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const auth = await institutionalSessionOrError(request, "moderator");
  if (!auth.session) return auth.response;
  const { reportId } = await context.params;
  if (!UUID_PATTERN.test(reportId)) {
    return NextResponse.json({ error: "Expediente invalido." }, { status: 400 });
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PREVIEW_REQUEST_BYTES) {
    return NextResponse.json({ error: "La vista previa es demasiado extensa." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la vista previa." }, { status: 400 });
  }
  const preview = parseExperiencePreview(body);
  if (!preview) {
    return NextResponse.json({ error: "Revisa el texto publico y los campos opcionales." }, { status: 400 });
  }
  try {
    const publication = await saveExperiencePublicationPreview({
      reportId,
      reviewer: auth.session.identity,
      preview,
    });
    return NextResponse.json({ publication }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ExperiencePublicationWorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Experience publication preview failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la vista previa." }, { status: 502 });
  }
}
