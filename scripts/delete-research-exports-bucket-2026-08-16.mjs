import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const BUCKET_ID = "research-exports";
const root = process.cwd();
const manifestPath = path.join(root, "data", "discovery", "deleted_research_exports_manifest_2026-08-16.json");
const resultPath = path.join(root, "data", "discovery", "deleted_research_exports_result_2026-08-16.json");

if (process.env.SUPABASE_PROJECT_REF !== PROJECT_REF) throw new Error(`SUPABASE_PROJECT_REF no coincide con ${PROJECT_REF}.`);
if (process.argv[2] !== `--confirm-delete=${BUCKET_ID}`) throw new Error(`Falta --confirm-delete=${BUCKET_ID}.`);

const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Falta configuración privada de Supabase.");

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function storageJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Storage respondió ${response.status}: ${await response.text()}`);
  return response.json();
}

async function listAllFiles(prefix = "") {
  const items = await storageJson(`${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(BUCKET_ID)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  const files = [];
  for (const item of items) {
    const name = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) files.push({ name, created_at: item.created_at, updated_at: item.updated_at, mime_type: item.metadata.mimetype, size_bytes: Number(item.metadata.size) });
    else files.push(...await listAllFiles(name));
  }
  return files;
}

const bucket = await storageJson(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(BUCKET_ID)}`);
const objectRows = await listAllFiles();
if (bucket.id !== BUCKET_ID) throw new Error(`No existe exactamente un bucket ${BUCKET_ID}.`);
if (bucket.public !== false) throw new Error(`${BUCKET_ID} dejó de ser privado; detener para revisar.`);
if (objectRows.length !== 5) throw new Error(`Se esperaban 5 objetos y hay ${objectRows.length}; detener para revisar.`);
if (objectRows.some((row) => row.mime_type !== "application/zip" || !row.name.startsWith("image-packs/2026-08-16/") || !row.name.endsWith(".zip"))) {
  throw new Error("El contenido del bucket no coincide con los cinco ZIP de investigación esperados.");
}

const objects = [];
for (const row of objectRows) {
  const encodedPath = row.name.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_ID}/${encodedPath}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo respaldar el hash de ${row.name}: ${response.status} ${await response.text()}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length !== Number(row.size_bytes)) throw new Error(`Tamaño discordante para ${row.name}.`);
  objects.push({ ...row, size_bytes: Number(row.size_bytes), sha256: createHash("sha256").update(buffer).digest("hex") });
}

const manifest = {
  operation_id: "delete-research-exports-2026-08-16",
  generated_at: new Date().toISOString(),
  project_ref: PROJECT_REF,
  bucket,
  deletion_reason: "Bucket privado de exportaciones temporales, redundante y sin uso por la aplicación pública; eliminación solicitada explícitamente por el usuario.",
  irreversible: true,
  object_count: objects.length,
  total_bytes: objects.reduce((sum, object) => sum + object.size_bytes, 0),
  objects,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const emptyResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(BUCKET_ID)}/empty`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: "{}",
});
if (!emptyResponse.ok) throw new Error(`No se pudo vaciar ${BUCKET_ID}: ${emptyResponse.status} ${await emptyResponse.text()}`);

let deleteSucceeded = false;
let deleteFailure = "";
for (let attempt = 1; attempt <= 5; attempt += 1) {
  const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(BUCKET_ID)}`, {
    method: "DELETE",
    headers,
  });
  if (deleteResponse.ok) {
    deleteSucceeded = true;
    break;
  }
  deleteFailure = `${deleteResponse.status} ${await deleteResponse.text()}`;
  if (!deleteFailure.includes("ResourceNotEmpty") || attempt === 5) break;
  await new Promise((resolve) => setTimeout(resolve, attempt * 500));
}
if (!deleteSucceeded) throw new Error(`El bucket quedó vacío pero no pudo eliminarse: ${deleteFailure}`);

const listResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers, cache: "no-store" });
if (!listResponse.ok) throw new Error(`No se pudo verificar la lista de buckets: ${listResponse.status} ${await listResponse.text()}`);
const buckets = await listResponse.json();
if (buckets.some((bucket) => bucket.id === BUCKET_ID)) throw new Error(`${BUCKET_ID} todavía aparece después de la eliminación.`);

const result = {
  operation_id: manifest.operation_id,
  completed_at: new Date().toISOString(),
  project_ref: PROJECT_REF,
  bucket_deleted: true,
  objects_deleted: objects.length,
  bytes_deleted: manifest.total_bytes,
  manifest: path.relative(root, manifestPath).replaceAll(path.sep, "/"),
  unaffected_buckets: buckets.map((bucket) => ({ id: bucket.id, public: bucket.public })),
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
