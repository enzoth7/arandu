import { sourceCategoryLabels as labelsForCategories } from "../../lib/facility-sources.mjs";
import { hasOfficialAdministrativeRecord } from "../../lib/facility-search.mjs";
import { foldText } from "../../lib/uruguay.mjs";
import type { Facility } from "./map-types";

export type FacilityDisplayCategory = "habilitado" | "mides" | "unconfirmed";

// Los predicados de situación viven en `lib/facility-search.mjs`, junto al
// filtrado que los usa, para que exista una única definición de «consta» y de
// «no se localizó información».
export {
  hasOfficialAdministrativeRecord,
  isUnconfirmedFacility,
  isUnconfirmedFacility as isVerificationFacility,
} from "../../lib/facility-search.mjs";

export function facilityDisplayCategory(facility: Facility): FacilityDisplayCategory {
  if (facility.mspFinal) return "habilitado";
  if (facility.midesSocial) return "mides";
  return "unconfirmed";
}

export function facilityDisplayLabel(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "habilitado") return "Habilitado";
  if (category === "mides") return "Certificado";
  return "Sin situación localizada";
}

/** Texto de búsqueda de una ficha, plegado para comparaciones sin acentos. */
export function facilityHaystack(facility: Facility) {
  return foldText(
    `${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort} ${facility.sourceLabel}`,
  );
}

function normalizedIdentity(value: string | null | undefined) {
  return foldText(value)
    .replace(/\b(de|del|la|el|los|las)\b/g, " ")
    .replace(/\bresidencia(?:l)?\b/g, "residencia")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityKeys(facility: Facility) {
  const department = normalizedIdentity(facility.department);
  const name = normalizedIdentity(facility.name);
  const nameTokenSet = name.split(" ").filter(Boolean).sort().join(" ");
  const address = normalizedIdentity(facility.address);
  return [
    name ? `name:${department}:${name}` : "",
    nameTokenSet ? `name-tokens:${department}:${nameTokenSet}` : "",
    address && address !== "sin direccion informada" && address !== "direccion pendiente confirmacion"
      ? `address:${department}:${address}`
      : "",
  ].filter(Boolean);
}

function preferredFacility(left: Facility, right: Facility) {
  const leftOfficial = hasOfficialAdministrativeRecord(left);
  const rightOfficial = hasOfficialAdministrativeRecord(right);
  if (leftOfficial !== rightOfficial) return leftOfficial ? left : right;
  if (left.privateCandidate !== right.privateCandidate) return left.privateCandidate ? left : right;
  return left;
}

export function consolidateFacilities(facilities: Facility[]) {
  const consolidated: Facility[] = [];
  const indexesByKey = new Map<string, number>();

  for (const facility of facilities) {
    const keys = identityKeys(facility);
    const existingIndex = keys.map((key) => indexesByKey.get(key)).find((index) => index !== undefined);
    const existing = existingIndex === undefined ? null : consolidated[existingIndex];
    const crossesPublicAndPrivateLayers = existing !== null
      && existing.privateCandidate !== facility.privateCandidate
      && (existing.privateCandidate === true || facility.privateCandidate === true);
    if (existingIndex === undefined || !crossesPublicAndPrivateLayers) {
      const nextIndex = consolidated.length;
      consolidated.push(facility);
      for (const key of keys) indexesByKey.set(key, nextIndex);
      continue;
    }

    const selected = preferredFacility(consolidated[existingIndex], facility);
    const merged = {
      ...selected,
      sourceCategories: [...new Set([
        ...(consolidated[existingIndex].sourceCategories || []),
        ...(facility.sourceCategories || []),
      ])],
    };
    consolidated[existingIndex] = merged;
    for (const key of identityKeys(merged)) indexesByKey.set(key, existingIndex);
  }

  return consolidated;
}

export function sourceCategoryLabels(facility: Facility) {
  return labelsForCategories(facility.sourceCategories);
}

export function evidenceDescription(tier: Facility["privateCandidateEvidenceTier"]) {
  if (tier === "A") return "Fuente oficial nominal";
  if (tier === "B") return "Dos fuentes públicas independientes";
  return "Pista pública todavía no corroborada";
}
