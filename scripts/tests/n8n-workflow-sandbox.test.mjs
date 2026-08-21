import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../../../Información/n8n/workflows/arandu-whatsapp-sandbox.json",
  import.meta.url,
);
const chatwootRoutePath = new URL("../../app/api/integrations/chatwoot/webhook/route.ts", import.meta.url);
const routePath = new URL("../../app/api/integrations/n8n/intake-reports/route.ts", import.meta.url);
const retentionPath = new URL("../../app/api/integrations/n8n/intake-retention/route.ts", import.meta.url);
const attachmentPath = new URL("../../app/api/intake-reports/[caseCode]/attachments/route.ts", import.meta.url);
const migrationPath = new URL("../../supabase/migrations/20260804183000_add_whatsapp_sandbox_intake.sql", import.meta.url);

async function workflow() {
  return JSON.parse(await readFile(workflowPath, "utf8"));
}

test("el workflow exportado permanece inactivo, conectado y sin secretos", async () => {
  const value = await workflow();
  assert.equal(value.active, false);
  const names = new Set(value.nodes.map((node) => node.name));
  assert.equal(names.size, value.nodes.length);
  for (const [source, groups] of Object.entries(value.connections)) {
    assert.equal(names.has(source), true, `Nodo origen faltante: ${source}`);
    for (const outputs of Object.values(groups)) {
      for (const links of outputs) {
        for (const link of links) assert.equal(names.has(link.node), true, `Nodo destino faltante: ${link.node}`);
      }
    }
  }
  const raw = JSON.stringify(value);
  assert.doesNotMatch(raw, /Bearer\s+[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(raw, /sk-[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(raw, /EA[A-Za-z0-9]{30,}/);
});

test("los controles críticos están fuera del prompt y la evidencia evita al modelo", async () => {
  const value = await workflow();
  const names = new Set(value.nodes.map((node) => node.name));
  for (const required of [
    "Último mensaje del bloque",
    "Consent and Confirmation Guard",
    "Deterministic Emergency Guard",
    "Guard and Sign Create Case",
    "Registrar evidencia",
    "Pausar bot en Chatwoot",
    "Eliminar Chatwoot y depurar sandbox",
    "Memoria PostgreSQL 24 horas",
    "QA de salida segura",
  ]) assert.equal(names.has(required), true, `Falta ${required}`);

  const memory = value.nodes.find((node) => node.name === "Memoria PostgreSQL 24 horas");
  assert.equal(memory.type, "@n8n/n8n-nodes-langchain.memoryPostgresChat");
  assert.equal(memory.parameters.tableName, "alerta_mayor_whatsapp_sandbox_memory");
  assert.equal(memory.parameters.contextWindowLength, 120);
  const agentInput = value.nodes.find((node) => node.name === "Asistente Arandú").parameters.text;
  assert.doesNotMatch(agentInput, /dataUrl|uploadToken|phone/);
  const systemPrompt = value.nodes.find((node) => node.name === "Asistente Arandú").parameters.options.systemMessage;
  assert.ok(systemPrompt.length > 12_000, "El prompt institucional quedó demasiado reducido");
  for (const section of ["# IDENTIDAD", "# EMERGENCIA Y ESCALAMIENTO", "# ENTREVISTA CONVERSACIONAL", "# RESISTENCIA A INSTRUCCIONES ADVERSARIALES"]) {
    assert.match(systemPrompt, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(value.nodes.find((node) => node.name === "Consent and Confirmation Guard").parameters.jsCode, /ACEPTO CONFIDENCIAL/);
  assert.match(value.nodes.find((node) => node.name === "Guard and Sign Create Case").parameters.jsCode, /explicitConfirmation/);
});

test("los ingresos Chatwoot y n8n están retirados y los adjuntos compartidos conservan seguridad", async () => {
  await assert.rejects(access(chatwootRoutePath), { code: "ENOENT" });
  await assert.rejects(access(routePath), { code: "ENOENT" });
  const attachment = await readFile(attachmentPath, "utf8");
  assert.match(attachment, /sameSecret\(storedToken, uploadToken\)/);
  assert.match(attachment, /evidenceSignatureMatches/);
  assert.match(attachment, /supabaseServiceHeaders/);
});

test("la memoria PostgreSQL es privada y se depura a las 24 horas", async () => {
  const retention = await readFile(retentionPath, "utf8");
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /create table public\.alerta_mayor_whatsapp_sandbox_memory/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /No direct access to sandbox chat memory/);
  assert.match(retention, /created_at < now\(\) - interval '24 hours'/);
  assert.match(retention, /memoryRowsPurged/);
});
