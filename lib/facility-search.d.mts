import type { Facility, FacilityStatus } from "../app/components/map-types";

export type SortOrder = "name" | "department" | "stage";

export type FacilitySearchCriteria = {
  foldedQuery?: string;
  department?: string;
  locality?: string;
  monthlyPriceMin?: number | null;
  monthlyPriceMax?: number | null;
  status?: "" | FacilityStatus;
  canonicalDepartmentOf?: (value: string) => string;
};

export type FacetOption = [label: string, count: number];
export const SORT_ORDERS: readonly SortOrder[];
export function hasOfficialAdministrativeRecord(facility: Facility): boolean;
export function isUnconfirmedFacility(facility: Facility): boolean;
export function matchesAdministrativeStatus(facility: Facility, status: FacilityStatus): boolean;
export function facilityStageRank(facility: Facility): number;
export function isSortOrder(value: unknown): value is SortOrder;
export function sortFacilities(facilities: readonly Facility[], order?: SortOrder): Facility[];
export function filterFacilities(
  facilities: readonly Facility[],
  criteria: FacilitySearchCriteria,
  haystackFor: (facility: Facility) => string,
): Facility[];
export function departmentOptions(
  facilities: readonly Facility[],
  canonicalDepartmentOf?: (value: string) => string,
): FacetOption[];
export function localityOptions(facilities: readonly Facility[]): FacetOption[];
