import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  SEARCH_TERMS,
  buildCandidates,
  candidatesToCsv,
  normalizeText,
  parseDepartmentList,
  readExistingLocal,
  redactRestrictedContent,
  summarizeCandidates,
} from "./lib/residencial-discovery.mjs";

const { Pool } = pg;
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const LOCAL_EXISTING_PATH = path.join(
  PROJECT_ROOT,
  "data",
  "discovery",
  "residenciales-live-2026-08-02.json",
);
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const GOOGLE_PLACES_ENDPOINT =
  "https://places.googleapis.com/v1/places:searchText";
const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items";
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
const SERPAPI_MAX_PAGES_HARD_LIMIT = 6;
const PAYSANDU_DEPARTMENT_TERMS = [
  "ELEPEM",
  "establecimiento de larga estadía para personas mayores",
  "residencial para adultos mayores",
  "residencial para personas mayores",
  "residencia para adultos mayores",
  "residencia para personas mayores",
  "hogar para adultos mayores",
  "hogar para personas mayores",
  "hogar de ancianos",
  "residencia de ancianos",
  "residencial de ancianos",
  "casa de salud para adultos mayores",
  "geriátrico",
  "residencial geriátrico",
  "residencia asistida",
  "residencial para la tercera edad",
  "asilo de ancianos",
  "nursing home Uruguay",
];
const PAYSANDU_LOCALITIES = [
  "Paysandú",
  "Guichón",
  "Quebracho",
  "Porvenir",
  "Piedras Coloradas",
  "Chapicuy",
  "Lorenzo Geyres",
  "Tambores",
  "Gallinal",
  "Orgoroso",
  "Morató",
  "El Eucalipto",
  "Cerro Chato",
  "Beisso",
  "Merinos",
  "Piñera",
];
const PAYSANDU_LOCALITY_TERMS = [
  "residencial para adultos mayores",
  "hogar de ancianos",
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) {
      args[argument.slice(2, equals)] = argument.slice(equals + 1);
      continue;
    }
    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function positiveInteger(value, fallback, label) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un entero positivo.`);
  }
  return parsed;
}

function positiveNumber(value, fallback, label) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un número positivo.`);
  }
  return parsed;
}

function selectedSources(value) {
  const allowed = new Set(["osm", "google", "apify", "serpapi"]);
  const sources = String(value || "osm")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  for (const source of sources) {
    if (!allowed.has(source)) throw new Error(`Fuente desconocida: ${source}.`);
  }
  return [...new Set(sources)];
}

function timestampForPath(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function defaultOutputPath(generatedAt) {
  return path.join(
    PROJECT_ROOT,
    "scratch",
    "elepem-discovery",
    timestampForPath(new Date(generatedAt)),
  );
}

function buildSearchJobs(options) {
  if (options.profile === "paysandu-completo") {
    const department = options.departments.find(
      (item) => normalizeText(item.name) === "paysandu",
    );
    if (!department || options.departments.length !== 1) {
      throw new Error(
        "El perfil paysandu-completo requiere --departments=Paysandú.",
      );
    }
    return [
      ...PAYSANDU_DEPARTMENT_TERMS.map((term) => ({
        department,
        term,
        location: "Departamento de Paysandú, Uruguay",
        query: `${term} en el departamento de Paysandú, Uruguay`,
      })),
      ...PAYSANDU_LOCALITIES.flatMap((locality) =>
        PAYSANDU_LOCALITY_TERMS.map((term) => ({
          department,
          term,
          locality,
          location: `${locality}, Paysandú, Uruguay`,
          query: `${term} en ${locality}, Paysandú, Uruguay`,
        })),
      ),
    ];
  }
  return options.departments.flatMap((department) =>
    SEARCH_TERMS.map((term) => ({
      department,
      term,
      location: `${department.name}, Uruguay`,
      query: `${term} en ${department.name}, Uruguay`,
    })),
  );
}

function poolFromEnvironment() {
  if (!process.env.SUPABASE_PROJECT_REF || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Faltan SUPABASE_PROJECT_REF o SUPABASE_DB_PASSWORD para --existing=database.",
    );
  }
  return new Pool({
    host:
      process.env.SUPABASE_DB_HOST ||
      `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized:
        process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
    },
    max: 2,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 10_000,
  });
}

async function readExistingDatabase() {
  const pool = poolFromEnvironment();
  try {
    const result = await pool.query(`
      select id, name, department, locality, address, lat, lng
      from public.residenciales
      order by id
    `);
    return result.rows.map((row) => ({
      ...row,
      lat: Number(row.lat),
      lng: Number(row.lng),
    }));
  } finally {
    await pool.end();
  }
}

async function fetchJson(url, options, label, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(options.timeoutMs || 180_000),
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(
          `${label}: HTTP ${response.status} ${body.slice(0, 500)}`,
        );
      }
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      }
    }
  }
  throw lastError;
}

function overpassQuery(department) {
  const namePattern =
    "(residencial|ancian|adultos mayores|personas mayores|tercera edad|geriatr|elepem)";
  return `[out:json][timeout:120];
area["ISO3166-2"="${department.iso}"]["boundary"="administrative"]->.searchArea;
(
  nwr["social_facility"="nursing_home"](area.searchArea);
  nwr["social_facility"="assisted_living"](area.searchArea);
  nwr["amenity"="nursing_home"](area.searchArea);
  nwr["healthcare"="nursing_home"](area.searchArea);
  nwr["amenity"="social_facility"]["social_facility:for"~"(senior|elderly|aged|older)",i](area.searchArea);
  nwr["amenity"="social_facility"]["name"~"${namePattern}",i](area.searchArea);
);
out tags center;`;
}

function osmAddress(tags) {
  const street = tags["addr:street"] || tags["addr:place"] || "";
  const number = tags["addr:housenumber"] || "";
  const direct = `${street} ${number}`.trim();
  return direct || tags["contact:address"] || tags.address || "";
}

function osmDiscovery(element, department) {
  const tags = element.tags || {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const name = tags.name || tags.operator || tags.brand || "";
  if (!name) return null;
  return {
    source: "openstreetmap",
    externalId: `${element.type}/${element.id}`,
    googlePlaceId: null,
    name,
    department: department.name,
    locality:
      tags["addr:city"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      tags["is_in:city"] ||
      "",
    address: osmAddress(tags),
    phone: tags["contact:phone"] || tags.phone || null,
    websiteUrl: tags["contact:website"] || tags.website || null,
    lat,
    lng,
    operationalStatus: null,
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    evidence: {
      amenity: tags.amenity || null,
      healthcare: tags.healthcare || null,
      socialFacility: tags.social_facility || null,
      socialFacilityFor: tags["social_facility:for"] || null,
    },
    queries: [
      `OSM ${department.iso}: nursing_home/social_facility para personas mayores`,
    ],
  };
}

async function fetchOverpassDepartment(department) {
  const body = new URLSearchParams({ data: overpassQuery(department) }).toString();
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await fetchJson(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "Arandu-ELEPEM-discovery/0.1",
          },
          body,
          timeoutMs: 180_000,
        },
        `Overpass ${department.name}`,
        2,
      );
      return (data.elements || [])
        .map((element) => osmDiscovery(element, department))
        .filter(Boolean);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function googleComponent(place, type) {
  return place.addressComponents?.find((component) =>
    component.types?.includes(type),
  )?.longText;
}

function googleDepartment(place, requested) {
  const component = googleComponent(place, "administrative_area_level_1") || "";
  const normalized = normalizeText(component);
  if (!normalized) return requested.name;
  const requestedNormalized = normalizeText(requested.name);
  return normalized.includes(requestedNormalized) ? requested.name : component;
}

function googleDiscovery(place, department, query) {
  return {
    source: "google_places",
    externalId: String(place.id),
    googlePlaceId: String(place.id),
    name: place.displayName?.text || "",
    department: googleDepartment(place, department),
    locality:
      googleComponent(place, "locality") ||
      googleComponent(place, "administrative_area_level_2") ||
      "",
    address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber || null,
    websiteUrl: place.websiteUri || null,
    lat: Number(place.location?.latitude),
    lng: Number(place.location?.longitude),
    operationalStatus: place.businessStatus || null,
    sourceUrl: place.googleMapsUri || null,
    queries: [query],
  };
}

async function fetchGooglePlaces({
  searchJobs,
  maxRequests,
  maxPages,
  includeContacts,
  requestUsage,
}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_PLACES_API_KEY en .env.local.");
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.addressComponents",
    "places.businessStatus",
    "places.googleMapsUri",
    "nextPageToken",
    ...(includeContacts
      ? ["places.nationalPhoneNumber", "places.websiteUri"]
      : []),
  ].join(",");
  const discoveries = [];

  outer: for (const job of searchJobs) {
      const { department, query } = job;
      let pageToken;
      for (let page = 1; page <= maxPages; page += 1) {
        if (requestUsage.googleRequests >= maxRequests) break outer;
        const data = await fetchJson(
          GOOGLE_PLACES_ENDPOINT,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": fieldMask,
            },
            body: JSON.stringify({
              textQuery: query,
              languageCode: "es",
              regionCode: "UY",
              pageSize: 20,
              ...(pageToken ? { pageToken } : {}),
            }),
            timeoutMs: 60_000,
          },
          `Google Places: ${query} (página ${page})`,
        );
        requestUsage.googleRequests += 1;
        for (const place of data.places || []) {
          const discovery = googleDiscovery(place, department, query);
          if (
            normalizeText(discovery.department).includes(
              normalizeText(department.name),
            )
          ) {
            discoveries.push(discovery);
          }
        }
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
  }
  requestUsage.googleRequestLimitReached =
    requestUsage.googleRequests >= maxRequests;
  return discoveries;
}

function apifyStableExternalId(item) {
  return String(
    item.placeId ||
      item.cid ||
      createHash("sha256")
        .update(`${item.title || item.name || ""}|${item.address || ""}`)
        .digest("hex")
        .slice(0, 20),
  );
}

function apifyDiscovery(item, department) {
  const location = item.location || {};
  const externalId = apifyStableExternalId(item);
  return {
    source: "apify",
    externalId,
    googlePlaceId: item.placeId ? String(item.placeId) : null,
    name: item.title || item.name || "",
    department: department.name,
    locality: item.city || item.neighborhood || "",
    address: item.address || item.street || "",
    phone: item.phone || item.phoneUnformatted || null,
    websiteUrl: item.website || null,
    lat: Number(location.lat ?? item.latitude),
    lng: Number(location.lng ?? item.longitude),
    operationalStatus:
      item.permanentlyClosed || item.temporarilyClosed
        ? item.permanentlyClosed
          ? "CLOSED_PERMANENTLY"
          : "CLOSED_TEMPORARILY"
        : null,
    sourceUrl: item.url || null,
    queries: item.searchString ? [item.searchString] : [...SEARCH_TERMS],
  };
}

async function fetchApify({
  departments,
  maxTotalChargeUsd,
  maxItems,
  maxPlacesPerSearch,
  requestUsage,
}) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Falta APIFY_TOKEN en .env.local.");
  const perRunCharge = maxTotalChargeUsd / departments.length;
  const perRunItems = Math.max(1, Math.floor(maxItems / departments.length));
  const discoveries = [];

  for (const department of departments) {
    const url = new URL(APIFY_ENDPOINT);
    url.searchParams.set("format", "json");
    url.searchParams.set("clean", "true");
    url.searchParams.set("maxItems", String(perRunItems));
    url.searchParams.set("maxTotalChargeUsd", String(perRunCharge));
    url.searchParams.set("timeout", "300");
    const data = await fetchJson(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchStringsArray: SEARCH_TERMS,
          locationQuery: `${department.name}, Uruguay`,
          maxCrawledPlacesPerSearch: maxPlacesPerSearch,
          language: "es",
          skipClosedPlaces: false,
          scrapePlaceDetailPage: false,
          includeWebResults: false,
          scrapeDirectories: false,
          scrapeContacts: false,
          scrapeSocialMediaProfiles: {
            facebooks: false,
            instagrams: false,
            youtubes: false,
            tiktoks: false,
            twitters: false,
          },
          scrapeReviewsPersonalData: false,
          maxImages: 0,
          scrapeImageAuthors: false,
          maximumLeadsEnrichmentRecords: 0,
          enableCompetitorAnalysis: false,
        }),
        timeoutMs: 330_000,
      },
      `Apify: ${department.name}`,
      1,
    );
    requestUsage.apifyRuns += 1;
    for (const item of Array.isArray(data) ? data : []) {
      const discovery = apifyDiscovery(item, department);
      if (discovery.name) discoveries.push(discovery);
    }
  }
  requestUsage.apifyMaximumTotalChargeUsd = maxTotalChargeUsd;
  return discoveries;
}

function serpApiStableExternalId(item) {
  return String(
    item.place_id ||
      item.data_id ||
      item.data_cid ||
      createHash("sha256")
        .update(`${item.title || ""}|${item.address || ""}`)
        .digest("hex")
        .slice(0, 20),
  );
}

function serpApiDiscovery(item, department, query) {
  const coordinates = item.gps_coordinates || {};
  return {
    source: "serpapi",
    externalId: serpApiStableExternalId(item),
    googlePlaceId: item.place_id ? String(item.place_id) : null,
    name: item.title || "",
    department: department.name,
    locality: "",
    address: item.address || "",
    phone: item.phone || null,
    websiteUrl: item.website || null,
    lat: Number(coordinates.latitude),
    lng: Number(coordinates.longitude),
    operationalStatus: item.open_state || null,
    sourceUrl: item.place_id_search || null,
    queries: [query],
    evidence: {
      type: item.type || null,
      types: Array.isArray(item.types) ? item.types : [],
      dataId: item.data_id || null,
      dataCid: item.data_cid || null,
    },
  };
}

function serpApiBelongsToDepartment(item, department) {
  const address = normalizeText(item.address || "");
  const requested = normalizeText(department.name);
  if (address.includes(`departamento de ${requested}`)) return true;
  if (requested !== "paysandu") return address.includes(requested);
  if (address.includes("argentina") || address.includes("departamento de ")) {
    return false;
  }
  const latitude = Number(item.gps_coordinates?.latitude);
  const longitude = Number(item.gps_coordinates?.longitude);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -32.58 &&
    latitude <= -31.0 &&
    longitude >= -58.3 &&
    longitude <= -56.1
  );
}

async function fetchSerpApi({ searchJobs, maxSearches, maxPages, requestUsage }) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("Falta SERPAPI_API_KEY en .env.local.");
  const discoveries = [];

  outer: for (const job of searchJobs) {
      const { department, query } = job;
      for (let page = 0; page < maxPages; page += 1) {
        if (requestUsage.serpApiSearches >= maxSearches) break outer;
        const url = new URL(SERPAPI_ENDPOINT);
        url.searchParams.set("engine", "google_maps");
        url.searchParams.set("type", "search");
        url.searchParams.set("q", query);
        url.searchParams.set("hl", "es");
        url.searchParams.set("gl", "uy");
        url.searchParams.set("start", String(page * 20));
        url.searchParams.set("api_key", apiKey);
        const data = await fetchJson(
          url,
          { method: "GET", timeoutMs: 60_000 },
          `SerpApi: ${department.name} (página ${page + 1})`,
          2,
        );
        requestUsage.serpApiSearches += 1;
        const rows = Array.isArray(data.local_results) ? data.local_results : [];
        for (const item of rows) {
          if (!serpApiBelongsToDepartment(item, department)) continue;
          const discovery = serpApiDiscovery(item, department, query);
          if (discovery.name) discoveries.push(discovery);
        }
        if (rows.length < 20) break;
      }
  }
  requestUsage.serpApiSearchLimitReached =
    requestUsage.serpApiSearches >= maxSearches;
  return discoveries;
}

function executionPlan(options) {
  const googleQueries = options.searchJobs.length;
  return {
    departments: options.departments.map((department) => department.name),
    sources: options.sources,
    searchTerms: SEARCH_TERMS,
    profile: options.profile,
    plannedSearches: options.searchJobs.length,
    coveredLocalities:
      options.profile === "paysandu-completo" ? PAYSANDU_LOCALITIES : [],
    existingSource: options.existingSource,
    google: options.sources.includes("google")
      ? {
          queries: googleQueries,
          theoreticalMaximumRequests: googleQueries * options.googleMaxPages,
          configuredRequestCap: options.maxGoogleRequests,
          fieldTier: options.googleContacts ? "Enterprise" : "Pro",
          credentialPresent: Boolean(process.env.GOOGLE_PLACES_API_KEY),
          requiresAcknowledgement: true,
        }
      : null,
    apify: options.sources.includes("apify")
      ? {
          runs: options.departments.length,
          maximumTotalChargeUsd: options.maxApifyChargeUsd,
          maximumItems: options.maxApifyItems,
          credentialPresent: Boolean(process.env.APIFY_TOKEN),
          requiresScrapingRiskAcknowledgement: true,
        }
      : null,
    serpapi: options.sources.includes("serpapi")
      ? {
          queries: googleQueries,
          theoreticalMaximumSearches: googleQueries * options.serpApiMaxPages,
          configuredSearchCap: options.maxSerpApiSearches,
          pagesPerQuery: options.serpApiMaxPages,
          credentialPresent: Boolean(process.env.SERPAPI_API_KEY),
          requiresScrapingRiskAcknowledgement: true,
        }
      : null,
  };
}

function validatePaidSources(args, options) {
  if (options.sources.includes("google")) {
    if (!args["acknowledge-paid-api"]) {
      throw new Error(
        "Places requiere --acknowledge-paid-api y --max-google-requests=N.",
      );
    }
    if (args["max-google-requests"] == null) {
      throw new Error("Falta el límite explícito --max-google-requests=N.");
    }
  }
  if (options.sources.includes("apify")) {
    if (!args["acknowledge-google-maps-scraping-risk"]) {
      throw new Error(
        "Apify requiere --acknowledge-google-maps-scraping-risk.",
      );
    }
    if (args["max-apify-charge-usd"] == null) {
      throw new Error("Falta --max-apify-charge-usd=N.");
    }
  }
  if (options.sources.includes("serpapi")) {
    if (!args["acknowledge-google-maps-scraping-risk"]) {
      throw new Error(
        "SerpApi requiere --acknowledge-google-maps-scraping-risk.",
      );
    }
    if (args["max-serpapi-searches"] == null) {
      throw new Error("Falta --max-serpapi-searches=N.");
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const options = {
    departments: parseDepartmentList(args.departments),
    sources: selectedSources(args.sources),
    existingSource: args.existing || "local",
    profile: args.profile || "standard",
    maxGoogleRequests: positiveInteger(
      args["max-google-requests"],
      1,
      "--max-google-requests",
    ),
    googleMaxPages: positiveInteger(
      args["google-max-pages-per-query"],
      3,
      "--google-max-pages-per-query",
    ),
    googleContacts: Boolean(args["google-contact-details"]),
    maxApifyChargeUsd: positiveNumber(
      args["max-apify-charge-usd"],
      1,
      "--max-apify-charge-usd",
    ),
    maxApifyItems: positiveInteger(
      args["max-apify-items"],
      1_000,
      "--max-apify-items",
    ),
    maxApifyPlacesPerSearch: positiveInteger(
      args["max-apify-places-per-search"],
      100,
      "--max-apify-places-per-search",
    ),
    maxSerpApiSearches: positiveInteger(
      args["max-serpapi-searches"],
      1,
      "--max-serpapi-searches",
    ),
    serpApiMaxPages: Math.min(
      SERPAPI_MAX_PAGES_HARD_LIMIT,
      positiveInteger(
        args["serpapi-max-pages-per-query"],
        3,
        "--serpapi-max-pages-per-query",
      ),
    ),
    outputPath: path.resolve(
      args.output || defaultOutputPath(generatedAt),
    ),
  };

  if (!new Set(["local", "database"]).has(options.existingSource)) {
    throw new Error("--existing debe ser local o database.");
  }
  if (!new Set(["standard", "paysandu-completo"]).has(options.profile)) {
    throw new Error("--profile debe ser standard o paysandu-completo.");
  }
  options.searchJobs = buildSearchJobs(options);

  const plan = executionPlan(options);
  if (args.plan) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  validatePaidSources(args, options);

  const existingRows =
    options.existingSource === "database"
      ? await readExistingDatabase()
      : await readExistingLocal(LOCAL_EXISTING_PATH);
  const requestUsage = { googleRequests: 0, apifyRuns: 0, serpApiSearches: 0 };
  const warnings = [];
  const discoveries = [];

  if (options.sources.includes("osm")) {
    for (const department of options.departments) {
      const rows = await fetchOverpassDepartment(department);
      discoveries.push(...rows);
      console.log(`OSM · ${department.name}: ${rows.length} hallazgos.`);
    }
  }

  if (options.sources.includes("google")) {
    const rows = await fetchGooglePlaces({
      searchJobs: options.searchJobs,
      maxRequests: options.maxGoogleRequests,
      maxPages: options.googleMaxPages,
      includeContacts: options.googleContacts,
      requestUsage,
    });
    discoveries.push(...rows);
    console.log(
      `Google Maps · ${rows.length} hallazgos en ${requestUsage.googleRequests} solicitudes.`,
    );
  }

  if (options.sources.includes("apify")) {
    const rows = await fetchApify({
      departments: options.departments,
      maxTotalChargeUsd: options.maxApifyChargeUsd,
      maxItems: options.maxApifyItems,
      maxPlacesPerSearch: options.maxApifyPlacesPerSearch,
      requestUsage,
    });
    discoveries.push(...rows);
    console.log(`Apify · ${rows.length} hallazgos.`);
    warnings.push(
      "Los resultados de Apify se mantienen para revisión interna por el riesgo contractual del scraping de Google Maps.",
    );
  }

  if (options.sources.includes("serpapi")) {
    const rows = await fetchSerpApi({
      searchJobs: options.searchJobs,
      maxSearches: options.maxSerpApiSearches,
      maxPages: options.serpApiMaxPages,
      requestUsage,
    });
    discoveries.push(...rows);
    console.log(
      `SerpApi · ${rows.length} hallazgos en ${requestUsage.serpApiSearches} búsquedas.`,
    );
    warnings.push(
      "SerpApi obtiene resultados de Google Maps mediante scraping: se conservan solo para revisión interna y la pertenencia territorial debe validarse manualmente.",
    );
  }

  const runtimeCandidates = buildCandidates(
    discoveries,
    existingRows,
    generatedAt,
  ).sort((left, right) => {
    const order = { new_candidate: 0, possible_match: 1, probable_match: 2 };
    return (
      order[left.matchStatus] - order[right.matchStatus] ||
      String(left.department).localeCompare(String(right.department), "es-UY") ||
      String(left.name || "").localeCompare(String(right.name || ""), "es-UY")
    );
  });

  const googleOnly = runtimeCandidates.filter(
    (candidate) => candidate.storagePolicy === "google_place_id_only",
  );
  if (googleOnly.length > 0) {
    warnings.push(
      "Los candidatos exclusivos de Places conservan solo place_id y metadatos de cruce; el contenido de Google no se escribió en disco.",
    );
    console.log("Google Maps · vista transitoria para revisión (contenido no guardado):");
    for (const candidate of googleOnly.slice(0, 100)) {
      console.log(
        `  ${candidate.id} · ${candidate.runtimePreview?.name || "Sin nombre"} · ${candidate.runtimePreview?.address || "Sin dirección"} · ${candidate.matchStatus}`,
      );
    }
    if (googleOnly.length > 100) {
      console.log(`  … ${googleOnly.length - 100} candidatos adicionales.`);
    }
  }

  const candidates = redactRestrictedContent(runtimeCandidates);
  const meta = {
    version: 1,
    generatedAt,
    departments: options.departments.map((department) => department.name),
    sources: options.sources,
    existingSource: options.existingSource,
    existingCount: existingRows.length,
    discoveryCount: discoveries.length,
    warnings,
    requestUsage,
    attribution: {
      openstreetmap: options.sources.includes("osm")
        ? "© OpenStreetMap contributors · ODbL"
        : null,
      google: options.sources.includes("google") ? "Google Maps" : null,
      apify: options.sources.includes("apify")
        ? "Apify Actor compass/crawler-google-places"
        : null,
      serpapi: options.sources.includes("serpapi")
        ? "SerpApi Google Maps Results API"
        : null,
    },
  };
  const summary = summarizeCandidates(candidates, meta);
  await mkdir(options.outputPath, { recursive: true });
  await writeFile(
    path.join(options.outputPath, "candidates.json"),
    `${JSON.stringify({ meta, candidates }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(options.outputPath, "candidates.csv"),
    `\uFEFF${candidatesToCsv(candidates)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(options.outputPath, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Resultados: ${options.outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
