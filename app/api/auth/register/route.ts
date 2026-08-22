import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
const NEUTRAL_MESSAGE = "Si el correo es válido, recibirás un enlace para confirmar tu cuenta y crear una contraseña.";

export async function POST(request: NextRequest) {
  let email = "";
  let firstName = "";
  let lastName = "";
  let phone = "";
  let accountType: "personal" | "elepem" = "personal";
  let termsAccepted = false;

  try {
    const body = await request.json() as {
      email?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      phone?: unknown;
      accountType?: unknown;
      termsAccepted?: unknown;
    };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 100) : "";
    lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 100) : "";
    phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : "";
    accountType = body.accountType === "elepem" ? "elepem" : "personal";
    termsAccepted = Boolean(body.termsAccepted);
  } catch {
    return NextResponse.json({ error: "Datos de registro no válidos." }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Por favor ingresá tu nombre y apellido." }, { status: 400 });
  }

  if (!phone || phone.length < 6) {
    return NextResponse.json({ error: "Por favor ingresá un teléfono de contacto válido." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Por favor ingresá un correo electrónico válido." }, { status: 400 });
  }

  if (!termsAccepted) {
    return NextResponse.json({ error: "Debés aceptar los Términos y Condiciones para registrarte." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const callback = new URL("/auth/callback", request.nextUrl.origin);
    callback.searchParams.set("next", "/crear-contrasena");
    callback.searchParams.set("kind", "signup");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: callback.toString(),
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          account_type: accountType,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
      return NextResponse.json(
        { error: "Supabase alcanzó temporalmente el límite de correos. Esperá una hora antes de volver a intentarlo." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
      );
    }
  } catch (error) {
    console.error("Account registration request failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No pudimos procesar el registro. Probá nuevamente en unos minutos." }, { status: 500 });
  }

  return NextResponse.json({ message: NEUTRAL_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}
