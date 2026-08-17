import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../../lib/supabase-db.ts", import.meta.url), "utf8");

test("Vercel usa el pool transaccional de Supabase con una conexión por instancia", () => {
  assert.match(source, /process\.env\.VERCEL === "1"/);
  assert.match(source, /endsWith\("\.pooler\.supabase\.com"\)/);
  assert.match(source, /port: usesVercelTransactionPooler \? 6543/);
  assert.match(source, /max: usesVercelTransactionPooler \? 1 : 3/);
});

test("el entorno local conserva el puerto explícito y TLS", () => {
  assert.match(source, /Number\(process\.env\.SUPABASE_DB_PORT \|\| 5432\)/);
  assert.match(source, /SUPABASE_DB_SSL_MODE === "disable"/);
  assert.match(source, /rejectUnauthorized: process\.env\.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true"/);
});
