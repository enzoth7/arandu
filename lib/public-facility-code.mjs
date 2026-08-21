const PUBLIC_FACILITY_CODE_PREFIX = "ELPM";
const PUBLIC_FACILITY_CODE_MIN_DIGITS = 4;
const PUBLIC_FACILITY_CODE_PATTERN = /^ELPM-(\d{4,})$/i;

function validRegistryId(value) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

export function formatPublicFacilityCode(registryId) {
  const id = validRegistryId(registryId);
  if (!id) throw new TypeError("El id del ELEPEM debe ser un entero positivo.");
  return `${PUBLIC_FACILITY_CODE_PREFIX}-${String(id).padStart(PUBLIC_FACILITY_CODE_MIN_DIGITS, "0")}`;
}

export function parsePublicFacilityCode(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(PUBLIC_FACILITY_CODE_PATTERN);
  return match ? validRegistryId(match[1]) : null;
}

export function publicFacilityPath(registryId) {
  return `/elepem/${formatPublicFacilityCode(registryId).toLocaleLowerCase("en-US")}`;
}
