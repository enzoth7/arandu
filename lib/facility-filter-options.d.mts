import type { Facility } from "../app/components/map-types";

export type FacilityAttributeFilterKey =
  | "stayTypes"
  | "roomPrivacyFeatures"
  | "environmentFeatures"
  | "accessibilityFeatures"
  | "careServices"
  | "dailyLifeFeatures";

export type FacilityAttributeFilters = Record<FacilityAttributeFilterKey, string[]>;

export type FacilityAttributeFilterGroup = {
  key: FacilityAttributeFilterKey;
  param: string;
  label: string;
  options: readonly (readonly [value: string, label: string])[];
};

export const FACILITY_ATTRIBUTE_FILTER_GROUPS: readonly FacilityAttributeFilterGroup[];
export function emptyFacilityAttributeFilters(): FacilityAttributeFilters;
export function normalizeFacilityAttributeFilters(value: unknown): FacilityAttributeFilters;
export function hasFacilityAttributeFilters(value: unknown): boolean;
export function facilityAttributeFilterLabel(groupKey: FacilityAttributeFilterKey, optionValue: string): string;
export function facilityMatchesAttributeFilter(
  facility: Partial<FacilityWithFilterAttributes>,
  groupKey: FacilityAttributeFilterKey,
  optionValue: string,
): boolean;

export type FacilityWithFilterAttributes = Pick<Facility, FacilityAttributeFilterKey>;
