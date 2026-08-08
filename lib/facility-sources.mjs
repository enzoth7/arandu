// Fuente única de la clasificación de procedencia y de las etiquetas de estado
// de los candidatos. Antes vivía duplicada (con expresiones regulares que ya
// habían divergido) en la ruta pública, el mapeo de candidatos privados y el
// hook del mapa.

/** @typedef {"official" | "public_maps" | "social_public" | "other_public"} SourceCategory */

const PUBLIC_MAPS_PATTERN = /openstreetmap|google\.com\/maps|maps\.google|maps\.app\.goo\.gl|serpapi|google maps|mapas? public|\bmapa\b/;
const SOCIAL_PATTERN = /instagram|facebook|redes? sociales?|social/;

export const SOURCE_CATEGORY_LABELS = Object.freeze({
  official: "Fuentes oficiales",
  public_maps: "Mapas públicos",
  social_public: "Redes sociales públicas",
  other_public: "Webs y directorios públicos",
});

export const CANDIDATE_STATUS_LABELS = Object.freeze({
  discovered: "Descubierto",
  possible_match: "Posible coincidencia",
  needs_review: "Necesita revisión",
  verified_new: "Nuevo verificado",
  verified_match: "Coincidencia verificada",
  rejected: "Rechazado",
  duplicate: "Duplicado",
  closed: "Cerrado",
});

/** Etiqueta legible de un estado de candidato, con reserva segura. */
export function candidateStatusLabel(status, fallback = "Sin revisar") {
  const key = typeof status === "string" ? status.trim() : "";
  return CANDIDATE_STATUS_LABELS[key] || key || fallback;
}

/** Etiquetas legibles de un conjunto de categorías de procedencia. */
export function sourceCategoryLabels(categories) {
  const labels = new Set();
  for (const category of categories || []) {
    const label = SOURCE_CATEGORY_LABELS[category];
    if (label) labels.add(label);
  }
  return [...labels];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Clasifica una fuente individual `{ sourceType, sourceUrl, sourceRecordKey }`.
 * @returns {SourceCategory}
 */
export function classifySource(source) {
  const record = source && typeof source === "object" ? source : {};
  const sourceType = text(record.sourceType);
  if (sourceType === "official") return "official";
  if (sourceType === "social_public_url") return "social_public";
  const context = `${text(record.sourceUrl)} ${text(record.sourceRecordKey)}`.toLocaleLowerCase("es-UY");
  if (sourceType === "openstreetmap" || PUBLIC_MAPS_PATTERN.test(context)) return "public_maps";
  if (SOCIAL_PATTERN.test(context)) return "social_public";
  return "other_public";
}

/**
 * Clasifica una lista de fuentes. Nunca devuelve una lista vacía.
 * @returns {SourceCategory[]}
 */
export function classifySources(sources) {
  const categories = new Set((Array.isArray(sources) ? sources : []).map(classifySource));
  if (categories.size === 0) categories.add("other_public");
  return [...categories];
}

/**
 * Clasifica una fila del padrón público, que expresa la procedencia mediante
 * banderas booleanas y una etiqueta de texto en vez de una lista de fuentes.
 * @returns {SourceCategory[]}
 */
export function classifyRegistryRow({ official = false, sourceLabel = "", otherSource = false }) {
  const categories = new Set();
  if (official) categories.add("official");
  const label = text(sourceLabel)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY");
  if (PUBLIC_MAPS_PATTERN.test(label)) categories.add("public_maps");
  if (SOCIAL_PATTERN.test(label)) categories.add("social_public");
  if (otherSource || categories.size === 0) categories.add("other_public");
  return [...categories];
}
