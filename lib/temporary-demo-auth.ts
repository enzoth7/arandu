import { createHmac, timingSafeEqual } from "node:crypto";

export const TEMPORARY_ADMIN_COOKIE = "arandu-temporary-admin";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret() {
  const value = process.env.INSTITUTIONAL_SESSION_SECRET
    || process.env.TEAM_SESSION_SECRET
    || process.env.SESSION_SECRET
    || "";
  if (value.length < 32) throw new Error("Temporary institutional session is not configured.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`arandu:temporary-admin:v1:${payload}`).digest("base64url");
}

function equal(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function temporaryAdminCredentialsMatch(username: string, password: string) {
  const expectedUsername = process.env.STATE_DEMO_USERNAME || process.env.TEAM_DEMO_USERNAME || "";
  const expectedPassword = process.env.STATE_DEMO_PASSWORD || process.env.TEAM_DEMO_PASSWORD || "";
  return expectedUsername.length >= 3 && expectedPassword.length >= 8
    && equal(username, expectedUsername) && equal(password, expectedPassword);
}

export function createTemporaryAdminSession(username: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ version: 1, username, expiresAt: now + MAX_AGE_SECONDS * 1000 }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readTemporaryAdminSession(value: string | undefined, now = Date.now()) {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !equal(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { version?: number; username?: string; expiresAt?: number };
    if (parsed.version !== 1 || typeof parsed.username !== "string" || !Number.isSafeInteger(parsed.expiresAt) || Number(parsed.expiresAt) <= now) return null;
    return { username: parsed.username, expiresAt: Number(parsed.expiresAt) };
  } catch { return null; }
}

export const temporaryAdminCookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE_SECONDS };
