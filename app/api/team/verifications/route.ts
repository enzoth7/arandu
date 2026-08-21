import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../lib/institutional-auth";
import { decideRelationship, RoleWorkflowError } from "../../../../lib/role-workflows-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "verifier");
  if (!auth.session) return auth.response;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const relationshipId = String(input.relationshipId || "");
  const action = String(input.action || "") as "approve" | "reject" | "dispute" | "revoke";
  if (!UUID.test(relationshipId) || !["approve", "reject", "dispute", "revoke"].includes(action)) return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
  try { return NextResponse.json(await decideRelationship({ actorId: auth.session.userId, relationshipId, action })); }
  catch (error) {
    if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Verification decision failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la decisión." }, { status: 500 });
  }
}
