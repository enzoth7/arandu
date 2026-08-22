import { NextResponse, type NextRequest } from "next/server";
import {
  clientIdentifier,
  MemoryRateLimitStore,
  type RateLimitRule,
  type RateLimitStore,
} from "./lib/rate-limit";
import { refreshSupabaseSession } from "./lib/supabase/middleware";

const MINUTE = 60_000;

/**
 * Reglas por endpoint sensible de cuenta.
 */
const RULES: { method: string; pathname: RegExp; rule: RateLimitRule; name: string }[] = [
  {
    name: "login",
    method: "POST",
    pathname: /^\/api\/auth\/(?:login|register|recover|password)$/,
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  if ((code || tokenHash) && pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", request.url);
    if (code) callbackUrl.searchParams.set("code", code);
    if (tokenHash) callbackUrl.searchParams.set("token_hash", tokenHash);
    const type = request.nextUrl.searchParams.get("type");
    if (type) callbackUrl.searchParams.set("type", type);
    callbackUrl.searchParams.set("next", "/crear-contrasena");
    callbackUrl.searchParams.set("kind", "signup");
    return NextResponse.redirect(callbackUrl);
  }

  const match = RULES.find(
    (entry) => entry.method === request.method && entry.pathname.test(pathname),
  );
  if (!match) return refreshSupabaseSession(request);


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
  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
