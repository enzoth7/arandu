import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { parseFacilityVisitAction } from "../../../../../lib/visit-scheduling.mjs";
import { applyFacilityVisitAction, VisitWorkflowError } from "../../../../../lib/visit-scheduling-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ visitId: string }> }) {
  const auth = await institutionalSessionOrError(request, "facility_representative");
  if (!auth.session) return auth.response;
  const { visitId } = await context.params;
  if (!UUID.test(visitId)) return NextResponse.json({ error: "Visita inválida." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Acción inválida." }, { status: 400 }); }
  const action = parseFacilityVisitAction(body);
  if (!action) return NextResponse.json({ error: "Revisá la acción, el horario y la nota." }, { status: 400 });
  try {
    return NextResponse.json({ visit: await applyFacilityVisitAction(
      auth.session.userId, auth.session.facilityIds, visitId, action,
    ) });
  } catch (error) {
    if (error instanceof VisitWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Facility visit action failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo actualizar la visita." }, { status: 502 });
  }
}
