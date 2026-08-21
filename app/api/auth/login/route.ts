import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { createTemporaryAdminSession, temporaryAdminCookieOptions, temporaryAdminCredentialsMatch, TEMPORARY_ADMIN_COOKIE } from "../../../../lib/temporary-demo-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let email = "";
  let password = "";
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // La respuesta de autenticación permanece genérica.
  }
  if (!email.includes("@") && temporaryAdminCredentialsMatch(email, password)) {
    const response = NextResponse.json({ authenticated: true, transitional: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TEMPORARY_ADMIN_COOKIE, createTemporaryAdminSession(email), { ...temporaryAdminCookieOptions, secure: request.nextUrl.protocol === "https:" });
    return response;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
}
