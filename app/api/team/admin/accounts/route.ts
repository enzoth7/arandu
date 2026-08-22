import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import type { InstitutionalRole } from "../../../../../lib/institutional-types";
import { assignInstitutionalRoleByEmail, RoleWorkflowError, updateInstitutionalAccount } from "../../../../../lib/role-workflows-db";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES: InstitutionalRole[] = ["administrator", "verifier", "moderator", "facility_representative"];

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "administrator");
  if (!auth.session) return auth.response;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const userId = String(input.userId || "");
  const email = String(input.email || "").trim().toLowerCase();
  const role = input.role ? String(input.role) as InstitutionalRole : undefined;
  const status = input.status ? String(input.status) as "active" | "suspended" | "revoked" : undefined;
  if (email) {
    if (!/^\S+@\S+\.\S+$/.test(email) || !role || !["administrator", "verifier", "moderator"].includes(role)) {
      return NextResponse.json({ error: "Correo o rol inválido." }, { status: 400 });
    }
    try {
      const implicitSupabase = (await import("@supabase/supabase-js")).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
        { auth: { flowType: "implicit", persistSession: false } }
      );

      const callback = new URL("/auth/callback", request.nextUrl.origin);
      callback.searchParams.set("next", "/crear-contrasena");
      callback.searchParams.set("kind", "signup");

      await implicitSupabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: callback.toString(),
          data: {
            account_type: "personal",
            institutional_role: role,
          },
        },
      });

      const result = await assignInstitutionalRoleByEmail({
        actorId: auth.session.userId,
        email,
        role: role as Exclude<InstitutionalRole, "facility_representative">,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof RoleWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error("Institutional role assignment failed.", { message: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "No se pudo asignar la función o enviar la invitación." }, { status: 500 });
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

