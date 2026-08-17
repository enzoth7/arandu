import { foldText } from "./uruguay.mjs";

export function hasOfficialAdministrativeRecord(facility) {
  return Boolean(facility.mspFinal || facility.midesSocial);
}

export function isUnconfirmedFacility(facility) {
  return facility.isDemo !== true && !hasOfficialAdministrativeRecord(facility);
}

export function matchesAdministrativeStatus(facility, status) {
  if (status === "habilitado") return Boolean(facility.mspFinal);
  if (status === "mides") return Boolean(facility.midesSocial);
  if (status === "app") return facility.isDemo === true;
  return isUnconfirmedFacility(facility);
}

export function facilityStageRank(facility) {
  if (facility.mspFinal) return 1;
  if (facility.midesSocial) return 2;
  return 3;
}

export const SORT_ORDERS = Object.freeze(["name", "department", "stage"]);

export function isSortOrder(value) {
  return SORT_ORDERS.includes(value);
}

const collator = new Intl.Collator("es-UY", { sensitivity: "base", numeric: true });
const byName = (left, right) => collator.compare(left.name || "", right.name || "");

export function sortFacilities(facilities, order = "name") {
  const list = [...facilities];
  if (order === "department") {
    return list.sort((left, right) =>
      collator.compare(left.department || "", right.department || "") || byName(left, right));
  }
  if (order === "stage") {
    return list.sort((left, right) => facilityStageRank(left) - facilityStageRank(right) || byName(left, right));
  }
  return list.sort(byName);
}

function publishedMonthlyPrice(facility) {
  const price = Number(facility.monthlyPriceUyu);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function sortFacilitiesByPrice(facilities, direction = "") {
  if (!["asc", "desc"].includes(direction)) return sortFacilities(facilities, "name");
  const multiplier = direction === "asc" ? 1 : -1;
  return [...facilities].sort((left, right) => {
    const leftPrice = publishedMonthlyPrice(left);
    const rightPrice = publishedMonthlyPrice(right);
    if (leftPrice === null && rightPrice === null) return byName(left, right);
    if (leftPrice === null) return 1;
    if (rightPrice === null) return -1;
    return (leftPrice - rightPrice) * multiplier || byName(left, right);
  });
}

export function prioritizeFacility(facilities, facilityId) {
  const list = [...facilities];
  const featuredIndex = list.findIndex((facility) => facility.id === facilityId);
  if (featuredIndex <= 0) return list;
  const [featured] = list.splice(featuredIndex, 1);
  list.unshift(featured);
  return list;
}

export function filterFacilities(facilities, criteria = {}, haystackFor) {
  const {
    foldedQuery = "",
    department = "",
    locality = "",
    monthlyPriceMin = null,
    monthlyPriceMax = null,
    status = "",
    qualityRating = "",
    photoAvailability = "",
    canonicalDepartmentOf = (value) => value,
  } = criteria;

  return facilities.filter((facility) => {
    if (foldedQuery && !haystackFor(facility).includes(foldedQuery)) return false;
    if (status && !matchesAdministrativeStatus(facility, status)) return false;
    if (qualityRating && facility.qualityRating !== qualityRating) return false;
    const hasPhoto = Boolean(
      (typeof facility.photoUrl === "string" && facility.photoUrl.trim())
      || (Array.isArray(facility.photoUrls) && facility.photoUrls.some((url) => typeof url === "string" && url.trim())),
    );
    if (photoAvailability === "with" && !hasPhoto) return false;
    if (photoAvailability === "without" && hasPhoto) return false;
    if (department && canonicalDepartmentOf(facility.department) !== department) return false;
    if (locality && foldText(facility.locality) !== foldText(locality)) return false;
    const priceFilterActive = Number.isFinite(monthlyPriceMin) || Number.isFinite(monthlyPriceMax);
    if (priceFilterActive) {
      const monthlyPrice = Number(facility.monthlyPriceUyu);
      if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) return false;
      if (Number.isFinite(monthlyPriceMin) && monthlyPrice < monthlyPriceMin) return false;
      if (Number.isFinite(monthlyPriceMax) && monthlyPrice > monthlyPriceMax) return false;
    }
    return true;
  });
}

function countBy(facilities, labelOf) {
  const counts = new Map();
  for (const facility of facilities) {
    const label = labelOf(facility);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => collator.compare(left, right));
}

export function departmentOptions(facilities, canonicalDepartmentOf = (value) => value) {
  return countBy(facilities, (facility) => canonicalDepartmentOf(facility.department));
}

export function localityOptions(facilities) {
  return countBy(facilities, (facility) => (facility.locality || "").trim());
}
