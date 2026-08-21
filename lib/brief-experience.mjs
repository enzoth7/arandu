export const BRIEF_EXPERIENCE_VERSION = 6;
export const BRIEF_EXPERIENCE_PRIVACY_NOTICE = "brief-experience-2026-08-21";

export const BRIEF_EXPERIENCE_RATINGS = Object.freeze([
  { value: "outstanding", label: "Sobresaliente" },
  { value: "good", label: "Bueno" },
  { value: "requires_improvement", label: "Requiere mejoras" },
  { value: "inadequate", label: "Inadecuado" },
  { value: "unrated", label: "Sin calificar" },
]);

export const BRIEF_EXPERIENCE_SECTIONS = Object.freeze([
  {
    id: "team_response",
    title: "Atención y respuesta del equipo",
    residentPrompt: "¿Cómo evaluás la atención y la respuesta del equipo?",
    familyPrompt: "¿Cómo evaluás la atención que recibe la persona y la respuesta del equipo?",
    aspects: [
      ["respectful_listening", "El trato, la escucha y el respeto"],
      ["daily_help", "La ayuda cuando se necesita"],
      ["health_support", "La atención general de salud"],
      ["emergency_response", "La respuesta ante emergencias"],
    ],
  },
  {
    id: "privacy",
    title: "Privacidad y vida personal",
    residentPrompt: "¿Cómo evaluás el respeto por tu privacidad y tu vida personal?",
    familyPrompt: "¿Cómo evaluás el respeto por su privacidad y su vida personal?",
    aspects: [
      ["room_entry", "El aviso y el permiso antes de entrar a la habitación"],
      ["private_conversations", "La privacidad para conversar o recibir visitas"],
      ["visit_rules", "Los horarios y las reglas para mantener vínculos"],
      ["personal_objects", "La posibilidad de tener objetos personales y decorar"],
    ],
  },
  {
    id: "daily_decisions",
    title: "Decisiones y vida cotidiana",
    residentPrompt: "¿Cómo evaluás tus posibilidades de decidir sobre tu vida cotidiana?",
    familyPrompt: "¿Cómo evaluás las posibilidades que tiene de decidir sobre su vida cotidiana?",
    aspects: [
      ["activities", "La posibilidad de elegir actividades"],
      ["rest", "El respeto por los tiempos de descanso"],
      ["menu", "La posibilidad de opinar o elegir sobre el menú"],
    ],
  },
  {
    id: "spaces_accessibility",
    title: "Espacios y accesibilidad",
    residentPrompt: "¿Cómo evaluás las condiciones y la accesibilidad del lugar?",
    familyPrompt: "¿Cómo evaluás las condiciones y la accesibilidad del lugar para la persona?",
    aspects: [
      ["light_ventilation", "La ventilación y la luz natural"],
      ["temperature", "La temperatura de los ambientes"],
      ["bathrooms", "Las condiciones y la accesibilidad de los baños"],
      ["circulation", "La facilidad para circular por el lugar"],
    ],
  },
  {
    id: "information_agreements",
    title: "Información y acuerdos",
    residentPrompt: "¿Cómo evaluás la información y los acuerdos con el residencial?",
    familyPrompt: "¿Cómo evaluás la información que reciben y los acuerdos con el residencial?",
    aspects: [
      ["medical_direction", "La información sobre la dirección técnica médica"],
      ["contract_costs", "La claridad del contrato y los costos"],
      ["before_signing", "La información recibida antes de firmar"],
      ["documents_money", "El manejo acordado de documentos y dinero"],
    ],
  },
]);

const SECTION_BY_ID = new Map(BRIEF_EXPERIENCE_SECTIONS.map((section) => [section.id, section]));
const RATING_VALUES = new Set(BRIEF_EXPERIENCE_RATINGS.map((rating) => rating.value));
const SUBMISSION_KEYS = new Set(["version", "facilityId", "answers", "comment", "publicationConsent", "sendToFacility", "shareContactWithFacility", "consent"]);
const ANSWER_KEYS = new Set(["sectionId", "rating", "reasonIds", "skipped"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function briefExperienceSituationPrefix(rating) {
  return {
    outstanding: "Funciona siempre o de forma especialmente buena",
    good: "En general funciona bien",
    requires_improvement: "Hay dificultades que deberían corregirse",
    inadequate: "No se cumple o existen problemas graves",
  }[rating] || "";
}

export function briefExperienceCommentPrompt(relationshipType) {
  return relationshipType === "resident"
    ? "¿Qué te gustaría que otra persona supiera sobre vivir en este residencial?"
    : "¿Qué te gustaría que otra familia o persona allegada supiera sobre este residencial?";
}

function exactKeys(value, keys) {
  return Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));
}

export function parseBriefExperienceSubmission(value) {
  if (!isRecord(value) || !exactKeys(value, SUBMISSION_KEYS) || value.version !== BRIEF_EXPERIENCE_VERSION) return null;
  const numericFacilityId = typeof value.facilityId === "number" ? value.facilityId : Number.NaN;
  const facilityId = Number.isSafeInteger(numericFacilityId) && numericFacilityId > 0 ? numericFacilityId : null;
  const demoFacilityId = typeof value.facilityId === "string" && /^DEMO-ELEPEM-\d{3}$/.test(value.facilityId) ? value.facilityId : null;
  if ((!facilityId && !demoFacilityId) || !Array.isArray(value.answers) || value.answers.length !== BRIEF_EXPERIENCE_SECTIONS.length) return null;

  const answerMap = new Map();
  for (const answer of value.answers) {
    if (!isRecord(answer) || !exactKeys(answer, ANSWER_KEYS) || typeof answer.sectionId !== "string" || answerMap.has(answer.sectionId)) return null;
    const section = SECTION_BY_ID.get(answer.sectionId);
    if (!section || typeof answer.skipped !== "boolean" || !Array.isArray(answer.reasonIds)) return null;
    if (answer.skipped) {
      if (answer.rating !== null || answer.reasonIds.length > 0) return null;
      answerMap.set(section.id, { sectionId: section.id, rating: null, reasonIds: [], skipped: true });
      continue;
    }
    if (typeof answer.rating !== "string" || !RATING_VALUES.has(answer.rating)) return null;
    const allowedReasons = new Set(section.aspects.map(([id]) => id));
    const reasonIds = [...new Set(answer.reasonIds)];
    if (answer.rating === "unrated" ? reasonIds.length > 0 : reasonIds.some((id) => typeof id !== "string" || !allowedReasons.has(id))) return null;
    answerMap.set(section.id, { sectionId: section.id, rating: answer.rating, reasonIds, skipped: false });
  }
  const answers = BRIEF_EXPERIENCE_SECTIONS.map((section) => answerMap.get(section.id));
  if (answers.some((answer) => !answer)) return null;

  if (typeof value.comment !== "string" || value.comment.length > 1_200 || /\0/.test(value.comment)) return null;
  const comment = value.comment.trim() || null;
  const hasRatedAnswer = answers.some((answer) => !answer.skipped && answer.rating !== "unrated");
  if (!hasRatedAnswer && !comment) return null;
  if (typeof value.publicationConsent !== "boolean" || typeof value.sendToFacility !== "boolean" || typeof value.shareContactWithFacility !== "boolean" || value.consent !== true) return null;
  if (value.shareContactWithFacility && !value.sendToFacility) return null;

  return {
    facilityId,
    demoFacilityId,
    answers,
    comment,
    publicationConsent: value.publicationConsent,
    sendToFacility: value.sendToFacility,
    shareContactWithFacility: value.shareContactWithFacility,
  };
}
