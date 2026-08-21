import { NextRequest, NextResponse } from "next/server";
import { parseExperienceWithdrawal } from "../../../../../../../lib/experience-publications.mjs";
import {
  ExperiencePublicationWorkflowError,
  withdrawExperiencePublication,
} from "../../../../../../../lib/experience-publication-db";
import { institutionalSessionOrError } from "../../../../../../../lib/institutional-auth";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_WITHDRAW_REQUEST_BYTES = 2_048;

export async function POST(
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
  if (declaredLength > MAX_WITHDRAW_REQUEST_BYTES) {
    return NextResponse.json({ error: "El motivo es demasiado extenso." }, { status: 413 });
  }
  let body: unknown = null;
  try {
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "No se pudo leer el motivo." }, { status: 400 });
  }
  const parsed = parseExperienceWithdrawal(body);
  if (!parsed) {
    return NextResponse.json({ error: "El motivo no puede superar 1.000 caracteres." }, { status: 400 });
  }
  try {
    const result = await withdrawExperiencePublication({
      reportId,
      reviewer: auth.session.identity,
      reason: parsed.reason,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ExperiencePublicationWorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Experience withdrawal failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo retirar la experiencia." }, { status: 502 });
  }
}
