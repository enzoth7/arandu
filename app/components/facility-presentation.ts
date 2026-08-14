import { foldText } from "../../lib/uruguay.mjs";
import type { Facility } from "./map-types";

export type FacilityDisplayCategory = "habilitado" | "mides" | "unconfirmed" | "demo";

export {
  hasOfficialAdministrativeRecord,
  isUnconfirmedFacility,
  isUnconfirmedFacility as isVerificationFacility,
} from "../../lib/facility-search.mjs";

export function facilityDisplayCategory(facility: Facility): FacilityDisplayCategory {
  if (facility.isDemo) return "demo";
  if (facility.mspFinal) return "habilitado";
  if (facility.midesSocial) return "mides";
  return "unconfirmed";
}

export function facilityDisplayLabel(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "habilitado") return "HabilitaciÃ³n MSP";
  if (category === "mides") return "Certificado social MIDES";
  if (category === "demo") return "DemostraciÃ³n";
  return "SituaciÃ³n no confirmada";
}

export function facilityHaystack(facility: Facility) {
  return foldText([
    facility.name,
    ...(facility.alternativeNames || []),
    facility.address,
    facility.locality,
    facility.department,
    facility.statusShort,
    facility.sourceLabel,
  ].join(" "));
}

/**
 * The database now guarantees one row per physical facility. This function
 * only protects the UI from a duplicated response id; it never merges rows by
 * similar names or addresses, which could silently alter KPI totals.
 */
export function consolidateFacilities(facilities: Facility[]) {
  const byId = new Map<string, Facility>();
  for (const facility of facilities) {
    if (!byId.has(facility.id)) byId.set(facility.id, facility);
  }
  return [...byId.values()];
}
