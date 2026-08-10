import { createHmac, timingSafeEqual } from "node:crypto";

export const CHATWOOT_TIMESTAMP_WINDOW_MS = 5 * 60 * 1_000;

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function chatwootSignature(secret, timestamp, rawBody) {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyChatwootWebhook({ headers, rawBody, secret, now = Date.now() }) {
  if (!secret || secret.length < 32) {
    return { ok: false, status: 503, error: "Webhook de Chatwoot no configurado." };
  }

  const timestamp = headers.get("x-chatwoot-timestamp") || "";
  const provided = headers.get("x-chatwoot-signature") || "";
  const parsed = Number(timestamp);
  const timestampMs = parsed < 10_000_000_000 ? parsed * 1_000 : parsed;

  if (!Number.isSafeInteger(parsed) || !Number.isFinite(timestampMs)) {
    return { ok: false, status: 401, error: "Timestamp inválido." };
  }
  if (Math.abs(now - timestampMs) > CHATWOOT_TIMESTAMP_WINDOW_MS) {
    return { ok: false, status: 401, error: "Firma vencida." };
  }

  const expected = chatwootSignature(secret, timestamp, rawBody);
  if (!constantTimeEqual(provided, expected)) {
    return { ok: false, status: 401, error: "Firma inválida." };
  }

  return { ok: true, timestamp: timestampMs };
}
