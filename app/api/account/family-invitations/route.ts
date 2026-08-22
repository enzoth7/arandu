import { NextRequest, NextResponse } from "next/server";
import { accountSessionOrError } from "../../../../lib/institutional-auth";
import { loadVerifiedPersonalRelationships } from "../../../../lib/brief-experience-db";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await accountSessionOrError();
  if (!auth.account) return auth.response;

  // Check that the user is a verified resident
  const verified = await loadVerifiedPersonalRelationships(auth.account.userId);
  const residentRelationship = verified.find((r) => r.relationshipType === "resident");
  if (!residentRelationship) {
    return NextResponse.json(
      { error: "Solo una persona residente con verificación activa puede invitar familiares." },
      { status: 403 }
    );
  }

  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Por favor ingresá un correo electrónico válido." }, { status: 400 });
  }

  if (email === auth.account.email.toLowerCase()) {
    return NextResponse.json({ error: "No podés invitar a tu propio correo." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const callback = new URL("/auth/callback", request.nextUrl.origin);
    callback.searchParams.set("next", "/crear-contrasena");
    callback.searchParams.set("kind", "signup");
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: callback.toString(),
        data: {
          account_type: "personal",
          invited_by_resident_id: auth.account.userId,
          facility_id: residentRelationship.facilityId,
          relationship_type: "family",
        },
      },
    });
  } catch (error) {
    console.error("Family invitation send failed:", error);
  }


  return NextResponse.json({
    message: `Invitación enviada a ${email}. Tu familiar podrá acceder a Arandú para compartir su experiencia.`,
  });
}
