import { NextResponse, type NextRequest } from "next/server";
import {
  clientIdentifier,
  MemoryRateLimitStore,
  type RateLimitRule,
  type RateLimitStore,
} from "./lib/rate-limit";

// El middleware sólo hace trabajo compatible con Edge. La sesión de equipo NO se
// verifica acá: `lib/team-session.mjs` usa `node:crypto`, que no existe en el
// runtime Edge. Esa verificación vive en el layout de `(protegido)` y en los
// route handlers, ambos en runtime Node.

const MINUTE = 60_000;

/**
 * Reglas por endpoint sensible. El acceso de organización es el más estricto:
 * hay una sola credencial compartida, así que la fuerza bruta es el riesgo real.
 */
const RULES: { method: string; pathname: RegExp; rule: RateLimitRule; name: string }[] = [
  {
    name: "login",
    method: "POST",
    pathname: /^\/api\/team\/session$/,
    rule: { limit: 5, windowMs: 15 * MINUTE },
  },
  {
    name: "intake",
    method: "POST",
    pathname: /^\/api\/intake-reports$/,
    rule: { limit: 10, windowMs: 10 * MINUTE },
  },
  {
    name: "attachments",
    method: "POST",
    pathname: /^\/api\/intake-reports\/[^/]+\/attachments$/,
    rule: { limit: 20, windowMs: 60 * MINUTE },
  },
  {
    name: "status",
    method: "GET",
    pathname: /^\/api\/intake-reports\/status$/,
    rule: { limit: 30, windowMs: MINUTE },
  },
];

const store: RateLimitStore = new MemoryRateLimitStore();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = RULES.find(
    (entry) => entry.method === request.method && entry.pathname.test(pathname),
  );
  if (!match) return NextResponse.next();

  const key = `${match.name}:${clientIdentifier(request.headers)}`;
  const result = store.hit(key, match.rule, Date.now());

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: ["/api/team/session", "/api/intake-reports", "/api/intake-reports/:path*"],
};
