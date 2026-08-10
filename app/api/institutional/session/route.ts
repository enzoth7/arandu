import { NextRequest, NextResponse } from "next/server";
import { createInstitutionalSession, INSTITUTIONAL_SESSION_COOKIE, institutionalIdentityForCredentials, readInstitutionalSession } from "../../../../lib/institutional-session.mjs";

export const runtime = "nodejs";

function cookieOptions(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: !local && (request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"),
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 400 });
  }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const identity = institutionalIdentityForCredentials(input.role, input.username, input.password);
  if (!identity) return NextResponse.json({ error: "Rol, usuario o contraseña incorrectos." }, { status: 401 });
  try {
    const response = NextResponse.json({ authenticated: true, role: identity.role });
    response.cookies.set(INSTITUTIONAL_SESSION_COOKIE, createInstitutionalSession(identity), cookieOptions(request));
    return response;
  } catch (error) {
    console.error("Institutional session creation failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "La sesión demo no está configurada." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const session = readInstitutionalSession(request.cookies.get(INSTITUTIONAL_SESSION_COOKIE)?.value);
  return NextResponse.json({ authenticated: Boolean(session), role: session?.role || null });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(INSTITUTIONAL_SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
