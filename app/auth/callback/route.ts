import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext.slice(0, 500)
    : "/cuenta";
  const kind = request.nextUrl.searchParams.get("kind");
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  const errorPath = kind === "signup" ? "/registrarse?error=enlace"
    : kind === "recovery" ? "/recuperar-contrasena?error=enlace"
      : "/iniciar-sesion?error=enlace";
  return NextResponse.redirect(new URL(errorPath, request.url));
}
