import { candidateStatusLabel, classifySources } from "./facility-sources.mjs";
import { canonicalDepartment, displayLocality } from "./uruguay.mjs";


function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function sourceUrl(value) {
  const text = optionalText(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function displayName(value) {
  const name = optionalText(value);
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : "Candidato sin nombre";
}

function isApprovedIdeSource(source) {
  const license = optionalText(source.sourceLicense).toLocaleLowerCase("es-UY");
  const url = optionalText(source.sourceUrl).toLocaleLowerCase("en-US");
  return license.includes("ide uruguay") || url.includes("direcciones.ide.uy/");
}

export function mapPrivateCandidateToFacility(value) {
  const candidate = record(value);
  const latitude = coordinate(candidate.latitude, -90, 90);
  const longitude = coordinate(candidate.longitude, -180, 180);
  const id = optionalText(candidate.id);
  if (!id || latitude === null || longitude === null) return null;

  const sources = Array.isArray(candidate.sources) ? candidate.sources.map(record) : [];
  const preferredSource = sources.find(isApprovedIdeSource) ||
    sources.find((source) => source.sourceType === "openstreetmap") || sources[0] || {};
  const approvedIdeCoordinates = isApprovedIdeSource(preferredSource);
  const evidenceTier = ["A", "B", "C"].includes(candidate.evidence_tier)
    ? candidate.evidence_tier
    : "C";
  const status = optionalText(candidate.status);
  const retrievedAt = optionalText(preferredSource.retrievedAt);
  const url = sourceUrl(preferredSource.sourceUrl);

  const facility = {
    id: `candidate:${id}`,
    name: displayName(candidate.name),
    department: canonicalDepartment(candidate.department) || "Sin departamento",
    locality: displayLocality(candidate.locality) || "Sin localidad",
    address: optionalText(candidate.address) || "Sin dirección informada",
    places: null,
    lat: latitude,
    lng: longitude,
    precision: "referencial",
    precisionLabel: "Coordenada observada en OpenStreetMap · sin verificar",
    statusGroup: "candidate_private",
    statusStage: "Candidato del piloto de descubrimiento",
    statusShort: `Candidato OSM del piloto · ${candidateStatusLabel(status)}`,
    sourceLabel: "© OpenStreetMap contributors · ODbL 1.0",
    mspFinal: false,
    mspRegistroHistorico: false,
    midesSocial: false,
    pacp: false,
    otherSource: false,
    pendingVerification: false,
    appDiscovered: false,
    sourceCategories: classifySources(sources),
    privateCandidate: true,
    privateCandidateStatus: status,
    privateCandidateEvidenceTier: evidenceTier,
    privateCandidateSourceUrl: url || undefined,
    privateCandidateRetrievedAt: retrievedAt || undefined,
    createdAt: optionalText(candidate.first_seen_at) || undefined,
    updatedAt: optionalText(candidate.last_seen_at) || undefined,
  };
  if (approvedIdeCoordinates) {
    facility.precisionLabel = "Geocodificacion IDE Uruguay aprobada";
    facility.statusStage = "Candidato privado revisado";
    facility.statusShort = `Coordenada IDE aprobada - ${candidateStatusLabel(status)}`;
    facility.sourceLabel = "IDE Uruguay - coordenada aprobada por revision humana";
  }
  return facility;
}

export function mapPrivateCandidatesToFacilities(values) {
  if (!Array.isArray(values)) return [];
  return values.map(mapPrivateCandidateToFacility).filter(Boolean);
}
