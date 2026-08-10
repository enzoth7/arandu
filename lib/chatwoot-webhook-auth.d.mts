export const CHATWOOT_TIMESTAMP_WINDOW_MS: number;
export function chatwootSignature(secret: string, timestamp: string, rawBody: string): string;
export function verifyChatwootWebhook(input: {
  headers: Headers;
  rawBody: string;
  secret: string;
  now?: number;
}):
  | { ok: true; timestamp: number }
  | { ok: false; status: number; error: string };
