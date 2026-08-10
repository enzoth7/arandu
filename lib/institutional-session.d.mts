export type InstitutionalSession = {
  role: "state" | "facility";
  identity: string;
  organizationId: string;
  facilityIds: string[];
  expiresAt: number;
};
export const INSTITUTIONAL_SESSION_COOKIE: string;
export const INSTITUTIONAL_SESSION_TTL_MS: number;
export function createInstitutionalSession(claims: Omit<InstitutionalSession, "expiresAt">, now?: number): string;
export function readInstitutionalSession(value: string | null | undefined, now?: number): InstitutionalSession | null;
export function institutionalIdentityForCredentials(role: unknown, username: unknown, password: unknown): Omit<InstitutionalSession, "expiresAt"> | null;
export function authorizeInstitutionalSession(value: string | null | undefined, requiredRole?: "state" | "facility", now?: number): { ok: true; session: InstitutionalSession } | { ok: false; status: 401 | 403 };
export function hasSameOrigin(requestUrl: string, origin: string | null): boolean;
