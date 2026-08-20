import {
  FACILITY_ATTRIBUTE_FILTER_GROUPS,
  normalizeFacilityAttributeFilters,
} from "./facility-filter-options.mjs";

export const PUBLIC_REGISTRY_STATE_VERSION = 1;
export const PUBLIC_REGISTRY_STATE_KEY = "arandu:public-registry-return:v1";
export const PUBLIC_REGISTRY_STATE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const REGISTRY_VIEWS = new Set(["list", "map", "mixed"]);
const FACILITY_STATUSES = new Set(["", "habilitado", "mides", "verificar"]);
const QUALITY_RATINGS = new Set(["", "outstanding", "good", "requires_improvement", "inadequate", "unrated"]);
const PRICE_ORDERS = new Set(["", "asc", "desc"]);
const PHOTO_AVAILABILITIES = new Set(["", "with", "without"]);
const FILTER_PARAM_KEYS = new Set([
  "q", "departamento", "situacion", "clasificacion", "precio_min", "precio_max", "orden", "fotos",
  ...FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => group.param),
]);
const MAX_SCROLL_OFFSET = 10_000_000;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteBetween(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isShortString(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

function normalizedString(value, maxLength, fallback = "", truncate = false) {
  if (typeof value !== "string") return fallback;
  if (value.length <= maxLength) return value;
  return truncate ? value.slice(0, maxLength) : fallback;
}

function normalizedEnum(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizedPriceRange(value) {
  if (!isRecord(value)) return null;
  const valid = isFiniteBetween(value.min, 0, 100_000_000)
    && isFiniteBetween(value.max, 0, 100_000_000)
    && value.min <= value.max;
  return valid ? { min: value.min, max: value.max } : null;
}

function normalizedScrollOffset(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_SCROLL_OFFSET, Math.max(0, value));
}

function normalizedViewport(value) {
  const valid = isRecord(value)
    && Array.isArray(value.center)
    && value.center.length === 2
    && isFiniteBetween(value.center[0], -90, 90)
    && isFiniteBetween(value.center[1], -180, 180)
    && isFiniteBetween(value.zoom, 4, 19);
  return valid ? { center: [value.center[0], value.center[1]], zoom: value.zoom } : null;
}

export function parsePublicRegistryState(raw, now = Date.now()) {
  if (typeof raw !== "string" || !raw) return null;

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || value.version !== PUBLIC_REGISTRY_STATE_VERSION) return null;
  if (!isFiniteBetween(value.savedAt, 1, now + 5 * 60 * 1000)) return null;
  if (now - value.savedAt > PUBLIC_REGISTRY_STATE_MAX_AGE_MS) return null;

  // El sobre (versión y vigencia) sí es estricto. Los campos de interacción son
  // deliberadamente tolerantes: un viewport viejo, un scroll de rebote o una
  // opción retirada no deben hacer perder una búsqueda que todavía es válida.
  const filters = isRecord(value.filters) ? value.filters : {};
  const scroll = isRecord(value.scroll) ? value.scroll : {};
  const selectedId = isShortString(value.selectedId, 160) && value.selectedId.length > 0
    ? value.selectedId
    : null;

  return {
    version: PUBLIC_REGISTRY_STATE_VERSION,
    savedAt: value.savedAt,
    filters: {
      query: normalizedString(filters.query, 200, "", true),
      department: normalizedString(filters.department, 100),
      monthlyPriceRange: normalizedPriceRange(filters.monthlyPriceRange),
      status: normalizedEnum(filters.status, FACILITY_STATUSES, ""),
      qualityRating: normalizedEnum(filters.qualityRating, QUALITY_RATINGS, ""),
      priceOrder: normalizedEnum(filters.priceOrder, PRICE_ORDERS, ""),
      photoAvailability: normalizedEnum(filters.photoAvailability, PHOTO_AVAILABILITIES, ""),
      attributeFilters: normalizeFacilityAttributeFilters(filters.attributeFilters),
    },
    registryView: normalizedEnum(value.registryView, REGISTRY_VIEWS, "mixed"),
    selectedId,
    mapAreaActive: value.mapAreaActive === true,
    scroll: {
      windowY: normalizedScrollOffset(scroll.windowY),
      resultsY: normalizedScrollOffset(scroll.resultsY),
    },
    mapViewport: normalizedViewport(value.mapViewport),
  };
}

function searchParamsOf(value) {
  if (value instanceof URLSearchParams) return new URLSearchParams(value);
  return new URLSearchParams(typeof value === "string" ? value.replace(/^\?/, "") : "");
}

export function hasPublicRegistryFilterParams(value) {
  const params = searchParamsOf(value);
  return [...FILTER_PARAM_KEYS].some((key) => params.has(key));
}

export function parsePublicRegistrySearchParams(value) {
  const params = searchParamsOf(value);
  const min = Number(params.get("precio_min"));
  const max = Number(params.get("precio_max"));
  const monthlyPriceRange = params.has("precio_min") && params.has("precio_max")
    && Number.isFinite(min) && min >= 0
    && Number.isFinite(max) && max >= min
    ? { min, max }
    : null;
  const rawAttributes = {};
  for (const group of FACILITY_ATTRIBUTE_FILTER_GROUPS) {
    rawAttributes[group.key] = params.getAll(group.param);
  }
  return {
    query: normalizedString(params.get("q"), 200, "", true),
    department: normalizedString(params.get("departamento"), 100),
    monthlyPriceRange,
    status: normalizedEnum(params.get("situacion") || "", FACILITY_STATUSES, ""),
    qualityRating: normalizedEnum(params.get("clasificacion") || "", QUALITY_RATINGS, ""),
    priceOrder: normalizedEnum(params.get("orden") || "", PRICE_ORDERS, ""),
    photoAvailability: normalizedEnum(params.get("fotos") || "", PHOTO_AVAILABILITIES, ""),
    attributeFilters: normalizeFacilityAttributeFilters(rawAttributes),
  };
}

export function serializePublicRegistrySearchParams(filters, currentValue = "") {
  const params = searchParamsOf(currentValue);
  for (const key of FILTER_PARAM_KEYS) params.delete(key);
  if (filters.query) params.set("q", normalizedString(filters.query, 200, "", true));
  if (filters.department) params.set("departamento", normalizedString(filters.department, 100));
  const range = normalizedPriceRange(filters.monthlyPriceRange);
  if (range) {
    params.set("precio_min", String(range.min));
    params.set("precio_max", String(range.max));
  }
  const status = normalizedEnum(filters.status, FACILITY_STATUSES, "");
  if (status) params.set("situacion", status);
  const qualityRating = normalizedEnum(filters.qualityRating, QUALITY_RATINGS, "");
  if (qualityRating) params.set("clasificacion", qualityRating);
  const priceOrder = normalizedEnum(filters.priceOrder, PRICE_ORDERS, "");
  if (priceOrder) params.set("orden", priceOrder);
  const photos = normalizedEnum(filters.photoAvailability, PHOTO_AVAILABILITIES, "");
  if (photos) params.set("fotos", photos);
  const attributes = normalizeFacilityAttributeFilters(filters.attributeFilters);
  for (const group of FACILITY_ATTRIBUTE_FILTER_GROUPS) {
    for (const option of attributes[group.key]) params.append(group.param, option);
  }
  return params;
}
