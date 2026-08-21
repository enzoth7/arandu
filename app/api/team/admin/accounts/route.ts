import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import type { InstitutionalRole } from "../../../../../lib/institutional-types";
import { assignInstitutionalRoleByEmail, RoleWorkflowError, updateInstitutionalAccount } from "../../../../../lib/role-workflows-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES: InstitutionalRole[] = ["administrator", "verifier", "moderator", "support", "facility_representative"];

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "administrator");
  if (!auth.session) return auth.response;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const userId = String(input.userId || "");
  const email = String(input.email || "").trim();
  const role = input.role ? String(input.role) as InstitutionalRole : undefined;
  const status = input.status ? String(input.status) as "active" | "suspended" | "revoked" : undefined;
  if (email) {
    if (!/^\S+@\S+\.\S+$/.test(email) || !role || !["administrator", "verifier", "moderator", "support"].includes(role)) return NextResponse.json({ error: "Correo o rol inválido." }, { status: 400 });
    try { return NextResponse.json(await assignInstitutionalRoleByEmail({ actorId: auth.session.userId, email, role: role as Exclude<InstitutionalRole, "facility_representative"> }), { status: 201 }); }
    catch (error) {
      if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error("Institutional role assignment failed.", { message: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "No se pudo asignar la función." }, { status: 500 });
    }
  }
  if (!UUID.test(userId) || (role && !ROLES.includes(role)) || (status && !["active", "suspended", "revoked"].includes(status))) return NextResponse.json({ error: "Actualización inválida." }, { status: 400 });
  try { return NextResponse.json(await updateInstitutionalAccount({ actorId: auth.session.userId, userId, role, status })); }
  catch (error) {
    if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Institutional account update failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo actualizar la cuenta." }, { status: 500 });
  }
}
