import { cache } from "react";
import {
  loadPublicFacilityByRegistryId,
  resolvePublicFacilityReference,
} from "./facility-registry";
import {
  formatPublicFacilityCode,
  parsePublicFacilityCode,
  publicFacilityPath,
} from "./public-facility-code.mjs";

export const resolvePublicFacilityRoute = cache(async (rawCode: string) => {
  const requestedCode = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!requestedCode || requestedCode.length > 240 || /[\u0000-\u001f]/.test(requestedCode)) return null;

  let registryId = parsePublicFacilityCode(requestedCode);
  if (!registryId) {
    const legacyReference = await resolvePublicFacilityReference(requestedCode);
    registryId = legacyReference?.id ?? null;
  }
  if (!registryId) return null;

  const facility = await loadPublicFacilityByRegistryId(registryId);
  if (!facility) return null;

  return {
    facility,
    publicCode: formatPublicFacilityCode(registryId),
    canonicalPath: publicFacilityPath(registryId),
  };
});
