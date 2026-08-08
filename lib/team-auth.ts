import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { readTeamSession, TEAM_SESSION_COOKIE } from "./team-session.mjs";

// Punto único de verificación de la sesión de equipo.
//
// Antes cada ruta repetía la lectura de la cookie y devolvía su propio mensaje
// de 401 (había dos redacciones distintas), y tres páginas de organización
// directamente no verificaban nada del lado del servidor.
//
// Nota de runtime: `team-session.mjs` usa `node:crypto`, que no existe en el
// runtime Edge. Por eso esta verificación vive en componentes de servidor y
// route handlers (runtime Node) y nunca en `middleware.ts`.

export const TEAM_LOGIN_PATH = "/organizacion/login";

export type TeamSession = { reviewer: string; expiresAt: number };

/**
 * Para componentes de servidor: devuelve la sesión o redirige al login.
 * Al usarse en un layout, ninguna página del segmento puede olvidar el control.
 */
export async function requireTeamSession(): Promise<TeamSession> {
  const cookieStore = await cookies();
  const session = readTeamSession(cookieStore.get(TEAM_SESSION_COOKIE)?.value);
  if (!session) redirect(TEAM_LOGIN_PATH);
  return session;
}

/** Para componentes de servidor que sólo necesitan saber si hay sesión. */
export async function readServerTeamSession(): Promise<TeamSession | null> {
  const cookieStore = await cookies();
  return readTeamSession(cookieStore.get(TEAM_SESSION_COOKIE)?.value);
}

/** Para route handlers: la sesión, o la respuesta 401 ya construida. */
export function teamSessionOrUnauthorized(
  request: NextRequest,
): { session: TeamSession; response: null } | { session: null; response: NextResponse } {
  const session = readTeamSession(request.cookies.get(TEAM_SESSION_COOKIE)?.value);
  if (session) return { session, response: null };
  return {
    session: null,
    response: NextResponse.json(
      { error: "La sesión de equipo venció. Volvé a ingresar." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    ),
  };
}
