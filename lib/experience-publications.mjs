import { isRecord } from "./intake-report.mjs";

export const PUBLIC_EXPERIENCE_PAGE_SIZE = 5;
export const PUBLIC_EXPERIENCE_MAX_PAGE_SIZE = 20;
export const PUBLIC_EXPERIENCE_BODY_MAX_LENGTH = 4_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalStrictText(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text || text.length > maxLength) return false;
  return text;
}
export function parseExperiencePreview(value) {
  if (!isRecord(value) || typeof value.publicBody !== "string") return null;
  const publicBody = value.publicBody.trim();
  const publicRelationship = optionalStrictText(value.publicRelationship, 160);
  const publicPeriod = optionalStrictText(value.publicPeriod, 160);
  if (
    publicBody.length < 10
    || publicBody.length > PUBLIC_EXPERIENCE_BODY_MAX_LENGTH
    || publicRelationship === false
    || publicPeriod === false
  ) return null;
  return { publicBody, publicRelationship, publicPeriod };
}

export function parseExperienceWithdrawal(value) {
  if (value === undefined || value === null || value === "") return { reason: null };
  if (!isRecord(value)) return null;
  const reason = optionalStrictText(value.reason, 1_000);
  return reason === false ? null : { reason };
}

export function parseExperiencePageLimit(value) {
  if (value === undefined || value === null || value === "") return PUBLIC_EXPERIENCE_PAGE_SIZE;
  if (!/^\d{1,2}$/.test(String(value))) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= PUBLIC_EXPERIENCE_MAX_PAGE_SIZE
    ? limit
    : null;
}

export function encodeExperienceCursor(value) {
  if (!value || !UUID_PATTERN.test(String(value.id || ""))) throw new Error("Invalid experience cursor id");
  const publishedAt = new Date(value.publishedAt);
  if (!Number.isFinite(publishedAt.getTime())) throw new Error("Invalid experience cursor date");
  return Buffer.from(JSON.stringify({
    version: 1,
    publishedAt: publishedAt.toISOString(),
    id: String(value.id).toLowerCase(),
  }), "utf8").toString("base64url");
}

export function decodeExperienceCursor(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const publishedAt = new Date(decoded?.publishedAt);
    if (
      decoded?.version !== 1
      || !UUID_PATTERN.test(String(decoded?.id || ""))
      || !Number.isFinite(publishedAt.getTime())
    ) return false;
    return { publishedAt: publishedAt.toISOString(), id: String(decoded.id).toLowerCase() };
  } catch {
    return false;
  }
}
