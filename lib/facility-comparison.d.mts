import type { Facility } from "../app/components/map-types";

export const MIN_COMPARISON: number;
export const MAX_COMPARISON: number;
export const NOT_AVAILABLE: string;

export type ComparisonOptions = {
  canonicalDepartmentOf?: (value: string) => string;
  institutionalLabelOf?: (facility: Facility) => string;
};

export type ComparisonField = {
  key: string;
  label: string;
  pending?: boolean;
  get: (facility: Facility) => string;
};

export type ComparisonRow = {
  key: string;
  label: string;
  pending: boolean;
  values: string[];
};

export function comparisonFields(options?: ComparisonOptions): ComparisonField[];
export function comparisonRows(
  facilities: readonly Facility[],
  options?: ComparisonOptions,
): ComparisonRow[];
export function toggleSelection(
  selectedIds: readonly string[],
  id: string,
  max?: number,
): string[];
export function canCompare(selectedIds: readonly string[]): boolean;
