export const PUBLIC_EXPERIENCE_PAGE_SIZE: number;
export const PUBLIC_EXPERIENCE_MAX_PAGE_SIZE: number;
export const PUBLIC_EXPERIENCE_BODY_MAX_LENGTH: number;

export type ExperiencePreviewInput = {
  publicBody: string;
  publicRelationship: string | null;
  publicPeriod: string | null;
};

export function parseExperiencePreview(value: unknown): ExperiencePreviewInput | null;
export function parseExperienceWithdrawal(value: unknown): { reason: string | null } | null;
export function parseExperiencePageLimit(value: unknown): number | null;
export function encodeExperienceCursor(value: { publishedAt: string | Date; id: string }): string;
export function decodeExperienceCursor(value: unknown): false | null | { publishedAt: string; id: string };
