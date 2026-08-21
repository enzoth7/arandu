import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../lib/institutional-auth";
import { parseVisitRequest } from "../../../lib/visit-scheduling.mjs";
import { createVisitRequest, listVisitorVisits, VisitWorkflowError } from "../../../lib/visit-scheduling-db";

export const runtime = "nodejs";

function workflowResponse(error: unknown) {
  if (error instanceof VisitWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("Visit request failed.", { message: error instanceof Error ? error.message : "unknown" });
  return NextResponse.json({ error: "No se pudo procesar la visita." }, { status: 502 });
}

export async function GET() {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  try {
    return NextResponse.json({ visits: await listVisitorVisits(auth.account.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return workflowResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = parseVisitRequest(body);
  if (!input) {
    return NextResponse.json({ error: "Revisá el horario, el contacto, la cantidad de asistentes y la nota práctica." }, { status: 400 });
  }
  try {
    return NextResponse.json({ visit: await createVisitRequest(auth.account.userId, input) }, { status: 201 });
  } catch (error) {
    return workflowResponse(error);
  }
}
