export type VisitStatus = "solicitada" | "horario_propuesto" | "confirmada" | "cancelada_usuario" | "cancelada_elepem" | "realizada" | "no_realizada";
export const VISIT_STATUSES: VisitStatus[];
export const VISIT_STATUS_LABELS: Record<VisitStatus, string>;
export function parseVisitRequest(value: unknown, now?: number): null | {
  facilityId: number; preferredStartAt: string; contactName: string; contactEmail: string | null;
  contactPhone: string | null; partySize: number; practicalNote: string | null; acknowledgedNotConfirmation: true;
};
export function parseVisitorVisitAction(value: unknown, now?: number): null | { action: "accept_proposal" | "cancel" } | { action: "request_alternative"; preferredStartAt: string };
export function parseFacilityVisitAction(value: unknown, now?: number): null | { action: "propose" | "confirm"; startAt: string; facilityNote: string | null } | { action: "cancel" | "complete" | "not_completed"; facilityNote: string | null };
export function nextVisitState(currentStatus: VisitStatus, action: string, context?: Record<string, unknown>): null | Record<string, unknown> & { status: VisitStatus };
export function parseVisitExperience(value: unknown): null | Record<string, unknown> & { version: 1; experienceKind: "visit"; visitId: string };
