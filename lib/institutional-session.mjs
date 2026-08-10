import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const INSTITUTIONAL_SESSION_COOKIE = "mas-cerca-institutional-session";
export const INSTITUTIONAL_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;

function digest(value) {
  return createHash("sha256").update(String(value ?? "")).digest();
}

function sameValue(left, right) {
  return timingSafeEqual(digest(left), digest(right));
}

function sessionSecret() {
  const secret = process.env.INSTITUTIONAL_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("Missing INSTITUTIONAL_SESSION_SECRET");
  return secret;
}

function signature(payload) {
  return createHmac("sha256", sessionSecret())
    .update(`mas-cerca-institutional-session:v1:${payload}`)
    .digest("base64url");
}

export function createInstitutionalSession(claims, now = Date.now()) {
  if (!["state", "facility"].includes(claims?.role)) throw new Error("Invalid institutional role");
  const identity = String(claims.identity || "").trim().slice(0, 200);
  const organizationId = String(claims.organizationId || "").trim().slice(0, 100);
  const facilityIds = Array.isArray(claims.facilityIds)
    ? [...new Set(claims.facilityIds.map(String).filter((id) => /^DEMO-ELEPEM-00[1-3]$/.test(id)))].slice(0, 3)
    : [];
  if (!identity || !organizationId || (claims.role === "facility" && facilityIds.length === 0)) {
    throw new Error("Incomplete institutional identity");
  }
  const encoded = Buffer.from(JSON.stringify({
    version: 1,
    role: claims.role,
    identity,
    organizationId,
    facilityIds,
    expiresAt: now + INSTITUTIONAL_SESSION_TTL_MS,
  }), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function readInstitutionalSession(value, now = Date.now()) {
  if (!value || typeof value !== "string") return null;
  const [payload, provided, extra] = value.split(".");
  if (!payload || !provided || extra) return null;
  try {
    if (!sameValue(provided, signature(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      parsed?.version !== 1
      || !["state", "facility"].includes(parsed.role)
      || typeof parsed.identity !== "string"
      || typeof parsed.organizationId !== "string"
      || !Array.isArray(parsed.facilityIds)
      || !Number.isSafeInteger(parsed.expiresAt)
      || parsed.expiresAt <= now
      || (parsed.role === "facility" && parsed.facilityIds.length === 0)
      || parsed.facilityIds.some((id) => !/^DEMO-ELEPEM-00[1-3]$/.test(id))
    ) return null;
    return {
      role: parsed.role,
      identity: parsed.identity,
      organizationId: parsed.organizationId,
      facilityIds: parsed.facilityIds,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function institutionalIdentityForCredentials(role, username, password) {
  const config = role === "state"
    ? {
        expectedUsername: process.env.STATE_DEMO_USERNAME || "",
        expectedPassword: process.env.STATE_DEMO_PASSWORD || "",
        organizationId: "STATE-DEMO-UY",
        facilityIds: [],
      }
    : role === "facility"
      ? {
          expectedUsername: process.env.FACILITY_DEMO_USERNAME || "",
          expectedPassword: process.env.FACILITY_DEMO_PASSWORD || "",
          organizationId: process.env.FACILITY_DEMO_ORGANIZATION_ID || "ORG-DEMO-001",
          facilityIds: (process.env.FACILITY_DEMO_IDS || "DEMO-ELEPEM-001").split(",").map((id) => id.trim()).filter(Boolean),
        }
      : null;
  if (!config || config.expectedUsername.length < 3 || config.expectedPassword.length < 12) return null;
  if (!sameValue(username, config.expectedUsername) || !sameValue(password, config.expectedPassword)) return null;
  return {
    role,
    identity: config.expectedUsername,
    organizationId: config.organizationId,
    facilityIds: config.facilityIds,
  };
}

export function authorizeInstitutionalSession(value, requiredRole, now = Date.now()) {
  const session = readInstitutionalSession(value, now);
  if (!session) return { ok: false, status: 401 };
  if (requiredRole && session.role !== requiredRole) return { ok: false, status: 403 };
  return { ok: true, session };
}

export function hasSameOrigin(requestUrl, origin) {
  if (!origin) return false;
  try {
    return new URL(requestUrl).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
