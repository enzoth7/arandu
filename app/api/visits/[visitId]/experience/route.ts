import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../../../lib/institutional-auth";
import { parseVisitExperience } from "../../../../../lib/visit-scheduling.mjs";
import { submitVisitExperience, VisitWorkflowError } from "../../../../../lib/visit-scheduling-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ visitId: string }> }) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  const { visitId } = await context.params;
  if (!UUID.test(visitId)) return NextResponse.json({ error: "Visita inválida." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Experiencia inválida." }, { status: 400 }); }
  const payload = parseVisitExperience({ ...(body && typeof body === "object" ? body as Record<string, unknown> : {}), visitId });
  if (!payload) return NextResponse.json({ error: "Completá la experiencia sin incluir datos personales ni información médica." }, { status: 400 });
  try {
    const result = await submitVisitExperience(auth.account.userId, visitId, payload);
    return NextResponse.json(result, { status: result.alreadySubmitted ? 200 : 201 });
  } catch (error) {
    if (error instanceof VisitWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Visit experience failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la experiencia." }, { status: 502 });
  }
}
