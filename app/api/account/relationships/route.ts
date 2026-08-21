import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../../lib/institutional-auth";
import { requestRelationship, RoleWorkflowError } from "../../../../lib/role-workflows-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const facilityId = Number(input.facilityId);
  const relationshipType = input.relationshipType;
  if (!Number.isSafeInteger(facilityId) || facilityId <= 0 || !["resident", "family"].includes(String(relationshipType))) {
    return NextResponse.json({ error: "Seleccioná un ELEPEM y un tipo de vínculo." }, { status: 400 });
  }
  try {
    const result = await requestRelationship(auth.account.userId, facilityId, relationshipType as "resident" | "family");
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Relationship request failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo enviar la solicitud." }, { status: 500 });
  }
}
