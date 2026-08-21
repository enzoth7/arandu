import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
const NEUTRAL_MESSAGE = "Si el correo es válido, recibirás un enlace para confirmar tu cuenta y crear una contraseña.";

export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  } catch {
    // Respuesta neutra para no revelar cuentas existentes.
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    try {
      const supabase = await createServerSupabaseClient();
      const callback = new URL("/auth/callback", request.nextUrl.origin);
      callback.searchParams.set("next", "/crear-contrasena");
      callback.searchParams.set("kind", "signup");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: callback.toString() },
      });
      if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
        return NextResponse.json(
          { error: "Supabase alcanzó temporalmente el límite de correos. Esperá una hora antes de volver a intentarlo." },
          { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
        );
      }
    } catch (error) {
      console.error("Account registration request failed.", { message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return NextResponse.json({ message: NEUTRAL_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}
