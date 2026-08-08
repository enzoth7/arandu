export type SourceCategory = "official" | "public_maps" | "social_public" | "other_public";

export const SOURCE_CATEGORY_LABELS: Readonly<Record<SourceCategory, string>>;
export const CANDIDATE_STATUS_LABELS: Readonly<Record<string, string>>;

export function candidateStatusLabel(status: unknown, fallback?: string): string;
export function sourceCategoryLabels(categories: readonly SourceCategory[] | undefined): string[];
export function classifySource(source: unknown): SourceCategory;
export function classifySources(sources: unknown): SourceCategory[];
export function classifyRegistryRow(row: {
  official?: boolean;
  sourceLabel?: string;
  otherSource?: boolean;
}): SourceCategory[];
