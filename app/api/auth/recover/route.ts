import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
const NEUTRAL_MESSAGE = "Si existe una cuenta para ese correo, recibirás un enlace para cambiar la contraseña.";

export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  } catch {
    // Respuesta neutra para no enumerar cuentas.
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    try {
      const supabase = await createServerSupabaseClient();
      const callback = new URL("/auth/callback", request.nextUrl.origin);
      callback.searchParams.set("next", "/restablecer-contrasena");
      callback.searchParams.set("kind", "recovery");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
        return NextResponse.json(
          { error: "Supabase alcanzó temporalmente el límite de correos. Esperá una hora antes de volver a intentarlo." },
          { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
        );
      }
    } catch (error) {
      console.error("Password recovery request failed.", { message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return NextResponse.json({ message: NEUTRAL_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}
