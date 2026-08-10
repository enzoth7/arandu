import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeInstitutionalSession, INSTITUTIONAL_SESSION_COOKIE, readInstitutionalSession, type InstitutionalSession } from "./institutional-session.mjs";
import type { InstitutionalRole } from "./institutional-types";

export async function readServerInstitutionalSession(): Promise<InstitutionalSession | null> {
  const cookieStore = await cookies();
  return readInstitutionalSession(cookieStore.get(INSTITUTIONAL_SESSION_COOKIE)?.value);
}

export async function requireInstitutionalRole(role: InstitutionalRole): Promise<InstitutionalSession> {
  const session = await readServerInstitutionalSession();
  if (!session) redirect(`/acceso-institucional?rol=${role}`);
  if (session.role !== role) redirect(session.role === "state" ? "/institucional/estado" : "/institucional/elepem");
  return session;
}

export function institutionalSessionOrError(request: NextRequest, requiredRole?: InstitutionalRole) {
  const authorization = authorizeInstitutionalSession(request.cookies.get(INSTITUTIONAL_SESSION_COOKIE)?.value, requiredRole);
  if (!authorization.ok && authorization.status === 401) {
    return { session: null, response: NextResponse.json({ error: "La sesión institucional venció." }, { status: 401 }) } as const;
  }
  if (!authorization.ok) {
    return { session: null, response: NextResponse.json({ error: "No tenés permiso para esta acción." }, { status: 403 }) } as const;
  }
  return { session: authorization.session, response: null } as const;
}
