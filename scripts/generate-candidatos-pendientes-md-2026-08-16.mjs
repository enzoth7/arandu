import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "Cambios", "02_pendiente_revision", "residenciales", "candidatos_pendientes_84.json");
const destination = path.join(root, "Cambios", "02_pendiente_revision", "residenciales", "candidatos_pendientes_84_por_departamento.md");

function cell(value) {
  const text = String(value ?? "").trim();
  return text ? text.replaceAll("|", "\\|").replace(/\s+/g, " ") : "—";
}

function sourceLink(value) {
  const url = String(value ?? "").trim();
  return url ? `[Fuente principal](${url.replaceAll("(", "%28").replaceAll(")", "%29")})` : "—";
}

const payload = JSON.parse(await readFile(source, "utf8"));
const candidates = payload.candidates;
if (!Array.isArray(candidates) || candidates.length !== 84) {
  throw new Error(`Se esperaban 84 candidatos y se encontraron ${Array.isArray(candidates) ? candidates.length : 0}.`);
}

const departments = ["Canelones", "Colonia", "Montevideo"];
const lines = [
  "# Candidatos residenciales pendientes por departamento",
  "",
  "Fecha de corte: 16 de agosto de 2026.",
  "",
  "Esta lista contiene los 84 candidatos operativos pendientes. Ninguno está marcado como listo para integración directa ni autorizado para escritura automática en Supabase. El candidato cerrado definitivamente fue excluido de este documento.",
  "",
  "| Departamento | Candidatos |",
  "|---|---:|",
  ...departments.map((department) => `| ${department} | ${candidates.filter((item) => item.department === department).length} |`),
  `| **Total** | **${candidates.length}** |`,
  "",
];

for (const department of departments) {
  const rows = candidates
    .filter((candidate) => candidate.department === department)
    .sort((a, b) => String(a.locality).localeCompare(String(b.locality), "es") || String(a.name).localeCompare(String(b.name), "es"));
  lines.push(`## ${department} (${rows.length})`, "", "| N.º | Residencial | Localidad | Dirección | Estado operativo | Evidencia | Revisión pendiente | Fuente |", "|---:|---|---|---|---|---|---|---|");
  rows.forEach((candidate, index) => {
    lines.push(`| ${index + 1} | ${cell(candidate.name)} | ${cell(candidate.locality)} | ${cell(candidate.address)} | ${cell(candidate.operational_status)} | ${cell(candidate.evidence_tier)} | ${cell(candidate.review_status)} | ${sourceLink(candidate.source_1)} |`);
  });
  lines.push("");
}

lines.push(
  "## Notas de uso",
  "",
  "- Antes de incorporar un candidato debe comprobarse que sigue activo y que no está duplicado en `public.elepem` ni en `public.elepem_sin_ubicacion`.",
  "- Los registros sin coordenadas utilizables corresponden a `public.elepem_sin_ubicacion` hasta completar una georreferencia verificable.",
  "- Los estados y niveles de evidencia se preservan tal como figuran en el conjunto operativo organizado.",
  "",
  `Fuente local: \`${path.relative(root, source).replaceAll(path.sep, "/")}\`.`,
  "",
);

await writeFile(destination, lines.join("\n"), "utf8");
console.log(JSON.stringify({ destination: path.relative(root, destination).replaceAll(path.sep, "/"), candidates: candidates.length, departments: Object.fromEntries(departments.map((department) => [department, candidates.filter((item) => item.department === department).length])) }, null, 2));
