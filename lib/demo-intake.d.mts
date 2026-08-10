export const DEMO_FACILITY_ID_PATTERN: RegExp;
export const EXPERIENCE_ANSWER_VALUES: Set<string>;
export function parseExperienceSubmission(value: unknown): null | {
  payload: Record<string, unknown> & { facilityId: string };
  contact: null | { name: string | null; phone: string | null; email: string | null };
};
export function demoIntakeEnabled(env?: Record<string, string | undefined>): boolean;
export function parseFacilityChangeSubmission(value: unknown): null | {
  facilityId: string;
  payload: Record<string, unknown>;
};
