export const DEMO_FACILITY_ID_PATTERN: RegExp;
export const EXPERIENCE_ANSWER_VALUES: Set<string>;
export const EXPERIENCE_PRIVACY_VALUES: Set<string>;
export function parseExperienceSubmission(value: unknown): null | {
  payload: Record<string, unknown> & {
    version: 4;
    facilityId: string;
    requestedDestination: "private_review" | "private_facility" | "consider_anonymized";
    publicationConsent: boolean;
    privacy: "Anónima" | "Confidencial" | "Con identidad registrada";
  };
  contact: null | { name: string | null; phone: string | null; email: string | null };
};
export function demoIntakeEnabled(env?: Record<string, string | undefined>): boolean;
export function parseFacilityChangeSubmission(value: unknown): null | {
  facilityId: string;
  payload: Record<string, unknown>;
};
