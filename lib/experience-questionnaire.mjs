export const EXPERIENCE_QUESTIONNAIRE_VERSION = "vcr1-30";
export const EXPERIENCE_SCORING_VERSION = "vcr1-dimensions-1";
export const EXPERIENCE_DRAFT_VERSION = 1;
export const EXPERIENCE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

const SOURCE_CARE_SYSTEM_2019 = "care_system_2019";
const SOURCE_ELEPEM_MOVEMENT_2026 = "elepem_movement_2026";
const SOURCE_ARANDU_METHODOLOGY_V1 = "arandu_methodology_v1";

function freezeEntries(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

export const EXPERIENCE_DIMENSIONS = freezeEntries([
  { id: "autonomy", title: "Trato, autonomía y participación", order: 1 },
  { id: "daily_life", title: "Vida cotidiana, vínculos y actividades", order: 2 },
  { id: "privacy", title: "Privacidad e intimidad", order: 3 },
  { id: "space", title: "Espacio y accesibilidad", order: 4 },
  { id: "care", title: "Equipo y cuidados", order: 5 },
  { id: "contract", title: "Contrato, costos y documentación", order: 6 },
]);

export const EXPERIENCE_SCALE_OPTIONS = Object.freeze({
  frequency: freezeEntries([
    { value: "always", label: "Siempre", score: 4 },
    { value: "almost_always", label: "Casi siempre", score: 3 },
    { value: "sometimes", label: "A veces", score: 2 },
    { value: "almost_never", label: "Casi nunca", score: 1 },
    { value: "never", label: "Nunca", score: 0 },
    { value: "unable_to_evaluate", label: "No pude evaluarlo", score: null },
    { value: "not_applicable", label: "No corresponde", score: null },
  ]),
  fulfillment: freezeEntries([
    { value: "yes_completely", label: "Sí, completamente", score: 4 },
    { value: "yes_generally", label: "Sí, en general", score: 3 },
    { value: "partly", label: "En parte", score: 2 },
    { value: "very_little", label: "Muy poco", score: 1 },
    { value: "no", label: "No", score: 0 },
    { value: "unable_to_evaluate", label: "No pude evaluarlo", score: null },
    { value: "not_applicable", label: "No corresponde", score: null },
  ]),
});

export const RELATIONSHIP_OPTIONS = freezeEntries([
  { value: "resident", label: "Persona que vive allí." },
  { value: "family_referent_friend_neighbor", label: "Familiar, referente, amigo/a o vecino/a." },
  { value: "caregiver_or_team_member", label: "Persona cuidadora u otro integrante del equipo." },
  { value: "worker_or_former_worker", label: "Otra persona que trabaja o ha trabajado en el establecimiento." },
  { value: "linked_person_or_organization", label: "Otra persona u organización vinculada con el ELEPEM." },
  { value: "other", label: "Otro (indicar)." },
]);

export const RESPONDENT_OPTIONS = freezeEntries([
  { value: "current_resident", label: "Persona que vive actualmente allí." },
  { value: "former_resident", label: "Persona que vivió allí anteriormente." },
  { value: "family_or_close_person", label: "Familiar o allegado/a." },
  { value: "other_direct_experience", label: "Otra persona con experiencia directa." },
  { value: "prefer_not_to_say", label: "Prefiero no indicarlo." },
]);

export const PARTICIPATION_OPTIONS = freezeEntries([
  { value: "direct", label: "Sí, directamente." },
  { value: "with_support", label: "Con apoyo." },
  { value: "jointly_discussed", label: "Respuestas conversadas conjuntamente." },
  { value: "did_not_participate", label: "No participó." },
  { value: "not_applicable", label: "No corresponde." },
  { value: "prefer_not_to_answer", label: "Prefiero no responder." },
]);

function question(id, number, dimensionId, scale, directText, representativeText, sourceIds) {
  return Object.freeze({
    id,
    position: number,
    number,
    dimensionId,
    scale,
    directText,
    representativeText,
    sourceIds: Object.freeze(sourceIds),
  });
}

export const EXPERIENCE_QUESTIONS = Object.freeze([
  question(
    "q01",
    1,
    "autonomy",
    "frequency",
    "¿Le llaman por su nombre o por el nombre que prefiere?",
    "¿Las personas son llamadas por su nombre o por el nombre que prefieren?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q02",
    2,
    "autonomy",
    "frequency",
    "¿Le preguntan qué quiere y respetan sus decisiones?",
    "¿Se consulta a las personas que viven allí sobre sus preferencias y se respetan sus decisiones?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q03",
    3,
    "autonomy",
    "frequency",
    "¿El personal habla directamente con usted, escucha lo que dice y tiene en cuenta su opinión?",
    "¿El personal habla directamente con las personas que viven allí, escucha lo que dicen y tiene en cuenta sus opiniones?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q04",
    4,
    "autonomy",
    "frequency",
    "¿Tiene oportunidades reales de hacer sugerencias y participar en decisiones del establecimiento?",
    "¿Las personas que viven allí tienen oportunidades reales de hacer sugerencias y participar en decisiones del establecimiento?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q05",
    5,
    "daily_life",
    "fulfillment",
    "¿La ubicación del establecimiento le permite mantener sus vínculos y llegar a lugares importantes para usted?",
    "¿La ubicación permite que las personas que viven allí mantengan sus vínculos y lleguen a lugares importantes para ellas?",
    [SOURCE_ARANDU_METHODOLOGY_V1],
  ),
  question(
    "q06",
    6,
    "daily_life",
    "frequency",
    "¿Los horarios de visita y las reglas del establecimiento facilitan el contacto con familiares y personas allegadas?",
    "¿Los horarios de visita y las reglas del establecimiento facilitan el contacto de las personas que viven allí con familiares y personas allegadas?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q07",
    7,
    "daily_life",
    "frequency",
    "¿Dispone de medios de comunicación y de un espacio privado para hablar por teléfono o recibir visitas?",
    "¿Las personas que viven allí disponen de medios de comunicación y de un espacio privado para hablar por teléfono o recibir visitas?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q08",
    8,
    "daily_life",
    "frequency",
    "¿Las actividades son variadas y se adaptan a sus gustos, intereses y posibilidades?",
    "¿Las actividades son variadas y se adaptan a los gustos, intereses y posibilidades de cada persona?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q09",
    9,
    "daily_life",
    "frequency",
    "¿Se respeta cuando decide descansar, estar a solas o no participar en una actividad?",
    "¿Se respeta cuando una persona decide descansar, estar a solas o no participar en una actividad?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q10",
    10,
    "daily_life",
    "frequency",
    "¿El menú está a la vista y tiene en cuenta sus necesidades y gustos?",
    "¿El menú está a la vista y tiene en cuenta las necesidades y gustos de cada persona?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q11",
    11,
    "daily_life",
    "fulfillment",
    "¿Puede entrar, salir y comunicarse con el exterior con los apoyos que necesita?",
    "¿Las personas que viven allí pueden entrar, salir y comunicarse con el exterior con los apoyos que necesitan?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q12",
    12,
    "privacy",
    "frequency",
    "¿Se respeta su intimidad durante la higiene y el uso del baño?",
    "¿Se respeta la intimidad de las personas que viven allí durante la higiene y el uso del baño?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q13",
    13,
    "privacy",
    "frequency",
    "¿Le avisan y le piden permiso antes de entrar a su habitación?",
    "¿Avisan y piden permiso antes de entrar a las habitaciones de las personas que viven allí?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q14",
    14,
    "privacy",
    "fulfillment",
    "¿Tiene un lugar propio y seguro para guardar sus objetos personales?",
    "¿Cada persona tiene un lugar propio y seguro para guardar sus objetos personales?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q15",
    15,
    "privacy",
    "frequency",
    "¿Tiene privacidad para recibir visitas y mantener conversaciones?",
    "¿Las personas que viven allí tienen privacidad para recibir visitas y mantener conversaciones?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q16",
    16,
    "privacy",
    "fulfillment",
    "¿Su dormitorio y los baños están libres de cámaras de videovigilancia?",
    "¿Los dormitorios y los baños están libres de cámaras de videovigilancia?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q17",
    17,
    "privacy",
    "frequency",
    "¿Le informan y le piden permiso antes de usar imágenes suyas o compartir su información personal?",
    "¿Se informa y se pide permiso a las personas que viven allí antes de usar sus imágenes o compartir su información personal?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q18",
    18,
    "space",
    "fulfillment",
    "¿Los espacios tienen buena ventilación, luz natural y una temperatura adecuada?",
    "¿Los espacios que usan las personas que viven allí tienen buena ventilación, luz natural y una temperatura adecuada?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q19",
    19,
    "space",
    "fulfillment",
    "¿Puede circular de forma segura y hay suficiente espacio entre las camas?",
    "¿Las personas que viven allí pueden circular de forma segura y hay suficiente espacio entre las camas?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q20",
    20,
    "space",
    "fulfillment",
    "¿Hay suficientes baños y son accesibles para usted?",
    "¿Hay suficientes baños y son accesibles para las personas que viven allí?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q21",
    21,
    "space",
    "fulfillment",
    "¿Puede abrir la puerta de su habitación desde adentro y está libre de trancas o candados externos?",
    "¿Las personas que viven allí pueden abrir las puertas de sus habitaciones desde adentro y están libres de trancas o candados externos?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q22",
    22,
    "space",
    "fulfillment",
    "¿Tiene libertad para llevar objetos personales y decorar su dormitorio como le gusta?",
    "¿Las personas que viven allí tienen libertad para llevar objetos personales y decorar sus dormitorios como les gusta?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q23",
    23,
    "space",
    "fulfillment",
    "¿Le permitieron conocer las instalaciones y le explicaron cómo está organizado el establecimiento?",
    "¿La persona responsable permitió conocer las instalaciones y explicó cómo está organizado el establecimiento?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q24",
    24,
    "care",
    "fulfillment",
    "¿Sabe quién está a cargo de la dirección técnica médica y cómo contactarla?",
    "¿Las personas que viven allí y sus referentes reciben información clara sobre quién está a cargo de la dirección técnica médica y cómo contactarla?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q25",
    25,
    "care",
    "frequency",
    "Cuando necesita ayuda o surge una emergencia, ¿el personal sabe cómo actuar?",
    "Cuando una persona necesita ayuda o surge una emergencia, ¿el personal sabe cómo actuar?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q26",
    26,
    "care",
    "fulfillment",
    "¿Su medicación se guarda de forma segura y ordenada?",
    "¿La medicación de las personas que viven allí se guarda de forma segura y ordenada?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q27",
    27,
    "contract",
    "fulfillment",
    "¿El contrato explica con claridad qué servicios incluye, cuánto cuestan, cómo se pagan y cuáles son sus derechos y obligaciones?",
    "¿El contrato explica con claridad qué servicios incluye, cuánto cuestan, cómo se pagan y cuáles son los derechos y obligaciones?",
    [SOURCE_CARE_SYSTEM_2019, SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q28",
    28,
    "contract",
    "fulfillment",
    "Antes de pedirle que firme, ¿le explican el contrato y el consentimiento de forma comprensible?",
    "Antes de solicitar una firma, ¿se explican el contrato y el consentimiento de forma comprensible?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
  question(
    "q29",
    29,
    "contract",
    "fulfillment",
    "¿Puede acceder a sus documentos personales y recibe información clara sobre cómo se administra su dinero?",
    "¿Las personas que viven allí pueden acceder a sus documentos personales y reciben información clara sobre cómo se administra su dinero?",
    [SOURCE_CARE_SYSTEM_2019],
  ),
  question(
    "q30",
    30,
    "contract",
    "fulfillment",
    "¿Puede hacer preguntas, pedir una copia y tomarse tiempo para revisar la información antes de decidir o firmar?",
    "¿Las personas pueden hacer preguntas, pedir una copia y tomarse tiempo para revisar la información antes de decidir o firmar?",
    [SOURCE_ELEPEM_MOVEMENT_2026],
  ),
]);

export const EXPERIENCE_QUESTION_BY_ID = Object.freeze(Object.fromEntries(
  EXPERIENCE_QUESTIONS.map((entry) => [entry.id, entry]),
));

const SCALE_VALUE_SETS = Object.freeze(Object.fromEntries(
  Object.entries(EXPERIENCE_SCALE_OPTIONS).map(([scale, options]) => [
    scale,
    new Set(options.map((option) => option.value)),
  ]),
));

const ANSWER_SCORE_BY_VALUE = new Map(
  Object.values(EXPERIENCE_SCALE_OPTIONS)
    .flat()
    .map((option) => [option.value, option.score]),
);

const RELATIONSHIP_VALUES = new Set(RELATIONSHIP_OPTIONS.map((option) => option.value));
const RESPONDENT_VALUES = new Set(RESPONDENT_OPTIONS.map((option) => option.value));
const PARTICIPATION_VALUES = new Set(PARTICIPATION_OPTIONS.map((option) => option.value));
const PRIVACY_MODE_VALUES = new Set(["anonymous", "confidential", "registered_identity"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalQuestion(questionOrId) {
  const id = typeof questionOrId === "string"
    ? questionOrId
    : isRecord(questionOrId) && typeof questionOrId.id === "string"
      ? questionOrId.id
      : "";
  return EXPERIENCE_QUESTION_BY_ID[id] || null;
}

export function isAnswerAllowedForQuestion(questionOrId, answer) {
  const entry = canonicalQuestion(questionOrId);
  return Boolean(entry && typeof answer === "string" && SCALE_VALUE_SETS[entry.scale]?.has(answer));
}

function categoryForAverage(average) {
  if (average === null) return null;
  if (average >= 3.5) return "outstanding";
  if (average >= 2.5) return "good";
  if (average >= 1.5) return "requires_improvement";
  return "inadequate";
}

export function scoreExperienceAnswers(answers) {
  const submittedAnswers = isRecord(answers) ? answers : {};
  const result = {};

  for (const dimension of EXPERIENCE_DIMENSIONS) {
    let sum = 0;
    let scoredCount = 0;
    let excludedCount = 0;
    let missingCount = 0;

    for (const entry of EXPERIENCE_QUESTIONS) {
      if (entry.dimensionId !== dimension.id) continue;
      const answer = submittedAnswers[entry.id];
      if (!isAnswerAllowedForQuestion(entry, answer)) {
        missingCount += 1;
        continue;
      }
      const score = ANSWER_SCORE_BY_VALUE.get(answer);
      if (score === null) {
        excludedCount += 1;
      } else {
        sum += score;
        scoredCount += 1;
      }
    }

    const preciseAverage = scoredCount > 0 ? sum / scoredCount : null;
    const average = preciseAverage === null
      ? null
      : Math.round(preciseAverage * 100) / 100;
    result[dimension.id] = {
      sum,
      scoredCount,
      excludedCount,
      missingCount,
      average,
      category: categoryForAverage(preciseAverage),
    };
  }

  return result;
}

function validTimestamp(value) {
  if (typeof value !== "string" || value.length > 40) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function nowTimestamp(now) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

export function sanitizeExperienceDraft(value, now = Date.now()) {
  if (!isRecord(value) || value.version !== EXPERIENCE_DRAFT_VERSION) return null;
  const savedAt = validTimestamp(value.savedAt);
  const currentTime = nowTimestamp(now);
  if (savedAt === null || savedAt > currentTime || currentTime - savedAt > EXPERIENCE_DRAFT_TTL_MS) return null;

  const draft = {
    version: EXPERIENCE_DRAFT_VERSION,
    savedAt: new Date(savedAt).toISOString(),
    answers: {},
  };

  if (Number.isInteger(value.step) && value.step >= 1 && value.step <= 9) {
    draft.step = value.step;
  }
  if (typeof value.facilityId === "string") {
    const facilityId = value.facilityId.trim();
    if (facilityId && facilityId.length <= 240) draft.facilityId = facilityId;
  }
  if (PRIVACY_MODE_VALUES.has(value.privacyMode)) draft.privacyMode = value.privacyMode;
  if (RELATIONSHIP_VALUES.has(value.relationship)) draft.relationship = value.relationship;
  if (RESPONDENT_VALUES.has(value.respondentType)) draft.respondentType = value.respondentType;
  if (PARTICIPATION_VALUES.has(value.residentParticipation)) draft.residentParticipation = value.residentParticipation;

  if (isRecord(value.answers)) {
    for (const [questionId, answer] of Object.entries(value.answers)) {
      if (isAnswerAllowedForQuestion(questionId, answer)) draft.answers[questionId] = answer;
    }
  }

  return draft;
}
