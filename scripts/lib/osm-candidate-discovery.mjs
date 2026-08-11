import { createHash } from "node:crypto";

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_SOURCE_LICENSE = "ODbL 1.0";
export const DEFAULT_OVERPASS_ENDPOINT =
  "https://overpass-api.de/api/interpreter";
export const DEFAULT_PROJECT_USER_AGENT =
  "Arandu-OSM-Discovery/1.0 (Uruguay ELEPEM candidate research)";

const ELEMENT_TYPES = ["node", "way", "relation"];
const SENIOR_FOR_PATTERN =
  "(^|;)(senior|seniors|elderly|aged|older_people|older_persons)(;|$)";

export const OSM_CANDIDATE_TAG_FILTERS = Object.freeze([
  '["amenity"="nursing_home"]',
  '["amenity"="retirement_home"]',
  '["amenity"="care_home"]',
  '["amenity"="old_people_home"]',
  '["healthcare"="nursing_home"]',
  '["healthcare"="assisted_living"]',
  '["healthcare"="care_home"]',
  '["building"="nursing_home"]',
  '["social_facility"="nursing_home"]',
  '["social_facility"="assisted_living"]',
  '["social_facility"="retirement_home"]',
  '["social_facility"="care_home"]',
  `["amenity"="social_facility"]["social_facility:for"~"${SENIOR_FOR_PATTERN}",i]`,
  `["social_facility"="group_home"]["social_facility:for"~"${SENIOR_FOR_PATTERN}",i]`,
]);

function integerInRange(value, minimum, maximum, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} debe estar entre ${minimum} y ${maximum}.`);
  }
  return parsed;
}

export function buildOverpassQuery({ timeoutSeconds = 90 } = {}) {
  const timeout = integerInRange(
    timeoutSeconds,
    10,
    300,
    "timeoutSeconds",
  );
  const selectors = ELEMENT_TYPES.flatMap((elementType) =>
    OSM_CANDIDATE_TAG_FILTERS.map(
      (tagFilter) => `  ${elementType}${tagFilter}(area.uruguay);`,
    ),
  );

  return [
    `[out:json][timeout:${timeout}];`,
    'area["ISO3166-1"="UY"]["boundary"="administrative"]["admin_level"="2"]->.uruguay;',
    "(",
    ...selectors,
    ");",
    "out tags center;",
  ].join("\n");
}

function optionalText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function firstText(...values) {
  for (const value of values) {
    const result = optionalText(value);
    if (result) return result;
  }
  return null;
}

function originalTags(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, tagValue]) => key && typeof tagValue === "string")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizedAddress(tags) {
  const fullAddress = firstText(tags["addr:full"]);
  if (fullAddress) return fullAddress;

  const street = firstText(tags["addr:street"], tags["addr:place"]);
  const houseNumber = firstText(tags["addr:housenumber"]);
  const unit = firstText(tags["addr:unit"]);
  const composed = [street, houseNumber, unit].filter(Boolean).join(" ");
  return composed || firstText(tags["contact:address"], tags.address);
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return parsed;
}

function elementCoordinates(element) {
  const latitude = coordinate(
    element.type === "node" ? element.lat : element.center?.lat,
    -90,
    90,
  );
  const longitude = coordinate(
    element.type === "node" ? element.lon : element.center?.lon,
    -180,
    180,
  );
  return latitude === null || longitude === null
    ? { latitude: null, longitude: null }
    : { latitude, longitude };
}

export function normalizeOsmElement(element, retrievedAt) {
  if (!element || typeof element !== "object") return null;
  if (!ELEMENT_TYPES.includes(element.type)) return null;
  if (!Number.isSafeInteger(Number(element.id))) return null;

  const retrievalDate = new Date(retrievedAt);
  if (!Number.isFinite(retrievalDate.getTime())) {
    throw new Error("retrievedAt debe ser una fecha ISO válida.");
  }

  const tags = originalTags(element.tags);
  const sourceRecordKey = `${element.type}/${element.id}`;
  const coordinates = elementCoordinates(element);

  return {
    sourceType: "openstreetmap",
    sourceRecordKey,
    externalId: sourceRecordKey,
    externalUrl: `https://www.openstreetmap.org/${sourceRecordKey}`,
    sourceLicense: OSM_SOURCE_LICENSE,
    attribution: OSM_ATTRIBUTION,
    retrievedAt: retrievalDate.toISOString(),
    name: firstText(tags.name),
    operator: firstText(tags.operator),
    address: normalizedAddress(tags),
    locality: firstText(
      tags["addr:city"],
      tags["addr:town"],
      tags["addr:village"],
      tags["addr:hamlet"],
      tags["is_in:city"],
    ),
    department: firstText(
      tags["addr:state"],
      tags["is_in:state"],
      tags["is_in:department"],
    ),
    phone: firstText(tags["contact:phone"], tags.phone),
    website: firstText(tags["contact:website"], tags.website),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    originalTags: tags,
  };
}

export function normalizeOverpassPayload(payload, retrievedAt) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.elements)) {
    throw new Error("Overpass no devolvió un arreglo elements válido.");
  }

  const candidatesByKey = new Map();
  for (const element of payload.elements) {
    const candidate = normalizeOsmElement(element, retrievedAt);
    if (candidate && !candidatesByKey.has(candidate.sourceRecordKey)) {
      candidatesByKey.set(candidate.sourceRecordKey, candidate);
    }
  }
  return [...candidatesByKey.values()].sort((left, right) =>
    left.sourceRecordKey.localeCompare(right.sourceRecordKey),
  );
}

export function buildProjectUserAgent(contact) {
  const normalizedContact = optionalText(contact);
  if (!normalizedContact) return DEFAULT_PROJECT_USER_AGENT;
  if (normalizedContact.length > 160 || /[\r\n]/.test(normalizedContact)) {
    throw new Error("El contacto del User-Agent no es válido.");
  }
  return `${DEFAULT_PROJECT_USER_AGENT.slice(0, -1)}; ${normalizedContact})`;
}

function retryAfterMilliseconds(response) {
  const value = response.headers?.get?.("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 60_000);
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.min(Math.max(date - Date.now(), 0), 60_000);
}

function retryableStatus(status) {
  return status === 429 || status >= 500;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function requestOverpass({
  endpoint = DEFAULT_OVERPASS_ENDPOINT,
  query,
  userAgent = DEFAULT_PROJECT_USER_AGENT,
  timeoutMs = 120_000,
  retries = 2,
  backoffMs = 1_500,
  maxResponseBytes = 10 * 1024 * 1024,
  fetchImpl = globalThis.fetch,
  sleepImpl = sleep,
} = {}) {
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== "https:") {
    throw new Error("El endpoint de Overpass debe usar HTTPS.");
  }
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Falta la consulta Overpass.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch no está disponible.");
  }

  const requestTimeout = integerInRange(timeoutMs, 5_000, 300_000, "timeoutMs");
  const retryCount = integerInRange(retries, 0, 4, "retries");
  const initialBackoff = integerInRange(backoffMs, 100, 30_000, "backoffMs");
  const body = new URLSearchParams({ data: query }).toString();
  let lastError;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Tiempo de espera de Overpass agotado.")),
      requestTimeout,
    );

    try {
      const response = await fetchImpl(endpointUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": userAgent,
        },
        body,
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = new Error(
          `Overpass respondió HTTP ${response.status}: ${responseText.slice(0, 300)}`,
        );
        error.status = response.status;
        error.retryAfterMs = retryAfterMilliseconds(response);
        throw error;
      }
      if (Buffer.byteLength(responseText, "utf8") > maxResponseBytes) {
        throw new Error("La respuesta de Overpass supera el límite permitido.");
      }
      const payload = JSON.parse(responseText);
      if (!Array.isArray(payload?.elements)) {
        throw new Error("La respuesta de Overpass no contiene elements.");
      }
      return payload;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status);
      const canRetry =
        attempt < retryCount &&
        (!Number.isFinite(status) || retryableStatus(status));
      if (!canRetry) throw error;

      const delay =
        error?.retryAfterMs ??
        Math.min(initialBackoff * 2 ** attempt, 30_000);
      await sleepImpl(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export function buildCacheDocument({
  endpoint,
  query,
  userAgent,
  retrievedAt,
  candidates,
}) {
  return {
    metadata: {
      schemaVersion: 1,
      sourceType: "openstreetmap",
      endpoint,
      retrievedAt,
      sourceLicense: OSM_SOURCE_LICENSE,
      attribution: OSM_ATTRIBUTION,
      userAgent,
      querySha256: createHash("sha256").update(query).digest("hex"),
      query,
      candidateCount: candidates.length,
      candidateOnly: true,
      writesPublicResidenciales: false,
    },
    candidates,
  };
}

