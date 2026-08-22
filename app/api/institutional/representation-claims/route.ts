import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../../lib/institutional-auth";
import { requestRepresentation, RoleWorkflowError } from "../../../../lib/role-workflows-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  const input = await request.json().catch(() => ({}));
  const facilityId = input.facilityId;
  const isDemo = typeof facilityId === "string" && facilityId.startsWith("DEMO-");
  const parsedId = isDemo ? facilityId : Number(facilityId);
  if ((!isDemo && (!Number.isSafeInteger(parsedId) || (parsedId as number) <= 0)) || !parsedId) return NextResponse.json({ error: "SeleccionÃ¡ un ELEPEM." }, { status: 400 });
  try {
    const result = await requestRepresentation(auth.account.userId, parsedId);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Representation request failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo enviar la solicitud." }, { status: 500 });
  }
}

