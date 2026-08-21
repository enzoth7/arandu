import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../../lib/institutional-auth";
import { parseVisitorVisitAction } from "../../../../lib/visit-scheduling.mjs";
import { applyVisitorVisitAction, VisitWorkflowError } from "../../../../lib/visit-scheduling-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ visitId: string }> }) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  const { visitId } = await context.params;
  if (!UUID.test(visitId)) return NextResponse.json({ error: "Visita inválida." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Acción inválida." }, { status: 400 }); }
  const action = parseVisitorVisitAction(body);
  if (!action) return NextResponse.json({ error: "Revisá la acción y el horario alternativo." }, { status: 400 });
  try {
    return NextResponse.json({ visit: await applyVisitorVisitAction(auth.account.userId, visitId, action) });
  } catch (error) {
    if (error instanceof VisitWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Visitor visit action failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo actualizar la visita." }, { status: 502 });
  }
}
