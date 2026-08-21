export const VISIT_STATUSES = [
  "solicitada",
  "horario_propuesto",
  "confirmada",
  "cancelada_usuario",
  "cancelada_elepem",
  "realizada",
  "no_realizada",
];

export const VISIT_STATUS_LABELS = {
  solicitada: "Solicitud enviada",
  horario_propuesto: "Horario propuesto",
  confirmada: "Visita confirmada",
  cancelada_usuario: "Cancelada por vos",
  cancelada_elepem: "Cancelada por el ELEPEM",
  realizada: "Visita realizada",
  no_realizada: "No realizada",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()0-9\s.-]{6,32}$/;
const SENSITIVE_NOTE_PATTERN = /\b(diagn[oó]stic\w*|medicaci[oó]n|historia\s+cl[ií]nica|c[eé]dula|patolog[ií]a\w*)\b/i;

const SPACE_VALUES = new Set(["bedrooms", "bathrooms", "dining_room", "common_areas", "outdoor", "could_not_tour"]);
const ANSWER_VALUES = new Set(["all", "some", "none", "no_questions"]);
const TOPIC_VALUES = new Set(["visits_calls", "food_activities", "outings_daily_life", "team_direction", "no_information"]);
const COST_VALUES = new Set(["monthly_price", "included", "extras", "price_changes", "written_contract", "no_information"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, maxLength) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : "";
}

function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return text(value, maxLength) || false;
}

function timestamp(value) {
  if (typeof value !== "string" || value.length > 40) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function numberId(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function stringList(value, allowed) {
  if (!Array.isArray(value)) return null;
  const items = [...new Set(value.filter((item) => typeof item === "string" && allowed.has(item)))];
  return items.length === value.length ? items : null;
}

export function parseVisitRequest(value, now = Date.now()) {
  if (!isRecord(value)) return null;
  const facilityId = numberId(value.facilityId);
  const preferredStartAt = timestamp(value.preferredStartAt);
  const contactName = text(value.contactName, 120);
  const contactEmail = optionalText(value.contactEmail, 254);
  const contactPhone = optionalText(value.contactPhone, 32);
  const practicalNote = optionalText(value.practicalNote, 500);
  const partySize = Number(value.partySize);
  if (
    !facilityId || !preferredStartAt || new Date(preferredStartAt).getTime() <= Number(now)
    || !contactName || contactEmail === false || contactPhone === false
    || (!contactEmail && !contactPhone)
    || (contactEmail && !EMAIL_PATTERN.test(contactEmail))
    || (contactPhone && !PHONE_PATTERN.test(contactPhone))
    || !Number.isInteger(partySize) || partySize < 1 || partySize > 6
    || practicalNote === false || (practicalNote && SENSITIVE_NOTE_PATTERN.test(practicalNote))
    || value.acknowledgedNotConfirmation !== true
  ) return null;
  return {
    facilityId,
    preferredStartAt,
    contactName,
    contactEmail,
    contactPhone,
    partySize,
    practicalNote,
    acknowledgedNotConfirmation: true,
  };
}

export function parseVisitorVisitAction(value, now = Date.now()) {
  if (!isRecord(value) || !["accept_proposal", "request_alternative", "cancel"].includes(value.action)) return null;
  if (value.action === "request_alternative") {
    const preferredStartAt = timestamp(value.preferredStartAt);
    if (!preferredStartAt || new Date(preferredStartAt).getTime() <= Number(now)) return null;
    return { action: value.action, preferredStartAt };
  }
  return { action: value.action };
}

export function parseFacilityVisitAction(value, now = Date.now()) {
  if (!isRecord(value) || !["propose", "confirm", "cancel", "complete", "not_completed"].includes(value.action)) return null;
  const facilityNote = optionalText(value.facilityNote, 500);
  if (facilityNote === false) return null;
  if (value.action === "propose" || value.action === "confirm") {
    const startAt = timestamp(value.startAt);
    if (!startAt || new Date(startAt).getTime() <= Number(now)) return null;
    return { action: value.action, startAt, facilityNote };
  }
  return { action: value.action, facilityNote };
}

export function nextVisitState(currentStatus, action, context = {}) {
  if (action === "accept_proposal" && currentStatus === "horario_propuesto" && context.proposedStartAt) {
    return { status: "confirmada", confirmedStartAt: context.proposedStartAt };
  }
  if (action === "request_alternative" && currentStatus === "horario_propuesto" && context.preferredStartAt) {
    return { status: "solicitada", preferredStartAt: context.preferredStartAt, proposedStartAt: null, confirmedStartAt: null };
  }
  if (action === "cancel" && ["solicitada", "horario_propuesto", "confirmada"].includes(currentStatus)) {
    return { status: context.actor === "facility" ? "cancelada_elepem" : "cancelada_usuario" };
  }
  if (action === "propose" && currentStatus === "solicitada" && context.startAt) {
    return { status: "horario_propuesto", proposedStartAt: context.startAt, confirmedStartAt: null };
  }
  if (action === "confirm" && ["solicitada", "horario_propuesto"].includes(currentStatus) && context.startAt) {
    return { status: "confirmada", confirmedStartAt: context.startAt };
  }
  if (["complete", "not_completed"].includes(action) && currentStatus === "confirmada" && context.confirmedStartAt) {
    const scheduled = new Date(context.confirmedStartAt).getTime();
    if (!Number.isFinite(scheduled) || scheduled > Number(context.now ?? Date.now())) return null;
    return { status: action === "complete" ? "realizada" : "no_realizada" };
  }
  return null;
}

export function parseVisitExperience(value) {
  if (!isRecord(value)) return null;
  const visitId = typeof value.visitId === "string" && UUID_PATTERN.test(value.visitId) ? value.visitId.toLowerCase() : null;
  const spaces = stringList(value.spaces, SPACE_VALUES);
  const topics = stringList(value.topics, TOPIC_VALUES);
  const costInformation = stringList(value.costInformation, COST_VALUES);
  const questionsAnswered = typeof value.questionsAnswered === "string" && ANSWER_VALUES.has(value.questionsAnswered)
    ? value.questionsAnswered
    : null;
  const usefulInformation = optionalText(value.usefulInformation, 1_000);
  const missingInformation = optionalText(value.missingInformation, 1_000);
  if (
    !visitId || !spaces || spaces.length === 0 || !topics || topics.length === 0
    || !costInformation || costInformation.length === 0 || !questionsAnswered
    || usefulInformation === false || missingInformation === false
    || (!usefulInformation && !missingInformation)
    || value.firstHandConfirmed !== true || value.noPersonalDataConfirmed !== true
  ) return null;
  return {
    version: 1,
    experienceKind: "visit",
    visitId,
    spaces,
    questionsAnswered,
    topics,
    costInformation,
    usefulInformation,
    missingInformation,
    firstHandConfirmed: true,
    noPersonalDataConfirmed: true,
    requestedDestination: value.publicationConsent === true ? "consider_anonymized" : "private_review",
    publicationConsent: value.publicationConsent === true,
    narrative: [usefulInformation, missingInformation].filter(Boolean).join(" "),
  };
}
