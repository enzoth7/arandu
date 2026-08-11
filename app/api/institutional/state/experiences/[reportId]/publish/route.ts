import { NextRequest, NextResponse } from "next/server";
import { parseExperiencePreview } from "../../../../../../../lib/experience-publications.mjs";
import {
  ExperiencePublicationWorkflowError,
  publishExperiencePublication,
} from "../../../../../../../lib/experience-publication-db";
import { institutionalSessionOrError } from "../../../../../../../lib/institutional-auth";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const auth = institutionalSessionOrError(request, "state");
  if (!auth.session) return auth.response;
  const { reportId } = await context.params;
  if (!UUID_PATTERN.test(reportId)) {
    return NextResponse.json({ error: "Expediente invalido." }, { status: 400 });
  }
  let preview;
  const rawBody = await request.text();
  if (rawBody.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "No se pudo leer el texto moderado." }, { status: 400 });
    }
    preview = parseExperiencePreview(body);
    if (!preview) {
      return NextResponse.json({ error: "Revisá el texto público antes de publicar." }, { status: 400 });
    }
  }
  try {
    const result = await publishExperiencePublication({ reportId, reviewer: auth.session.identity, preview });
    return NextResponse.json(result, {
      status: result.alreadyPublished ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ExperiencePublicationWorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Experience publication failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo publicar la experiencia." }, { status: 502 });
  }
}
