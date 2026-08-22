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

const DYNAMIC_ASPECT_LABELS = {
  team_response: {
    outstanding: {
      resident: {
        respectful_listening: "El trato del equipo es siempre respetuoso, cálido y atento.",
        daily_help: "Recibo ayuda y asistencia de inmediato cada vez que la necesito.",
        health_support: "La atención y el seguimiento general de salud son excelentes.",
        emergency_response: "Ante cualquier emergencia o malestar, la respuesta es inmediata y eficaz.",
      },
      family: {
        respectful_listening: "El trato hacia la persona es siempre respetuoso, cálido y atento.",
        daily_help: "Recibe ayuda y asistencia de inmediato cada vez que la necesita.",
        health_support: "La atención y el seguimiento general de salud son excelentes.",
        emergency_response: "Ante cualquier emergencia o malestar, la respuesta es inmediata y eficaz.",
      },
    },
    good: {
      resident: {
        respectful_listening: "En general el trato del equipo es respetuoso y correcto.",
        daily_help: "Habitualmente recibo ayuda adecuada cuando la necesito.",
        health_support: "La atención general de salud es adecuada.",
        emergency_response: "La respuesta ante emergencias es correcta y oportuna.",
      },
      family: {
        respectful_listening: "En general el trato hacia la persona es respetuoso y correcto.",
        daily_help: "Habitualmente recibe ayuda adecuada cuando la necesita.",
        health_support: "La atención general de salud es adecuada.",
        emergency_response: "La respuesta ante emergencias es correcta y oportuna.",
      },
    },
    requires_improvement: {
      resident: {
        respectful_listening: "A veces el trato del equipo es poco paciente, distante o desatento.",
        daily_help: "A veces hay demoras o falta de personal cuando necesito ayuda.",
        health_support: "La atención de salud tiene fallas de coordinación o seguimiento.",
        emergency_response: "La respuesta ante emergencias o malestares ha presentado demoras.",
      },
      family: {
        respectful_listening: "A veces el trato hacia la persona es poco paciente, distante o desatento.",
        daily_help: "A veces hay demoras o falta de personal cuando necesita ayuda.",
        health_support: "La atención de salud tiene fallas de coordinación o seguimiento.",
        emergency_response: "La respuesta ante emergencias o malestares ha presentado demoras.",
      },
    },
    inadequate: {
      resident: {
        respectful_listening: "El trato del equipo es habitualmente irrespetuoso o inadecuado.",
        daily_help: "No recibo la ayuda necesaria o hay desatención en tareas esenciales.",
        health_support: "Hay desatención grave en la salud o falta de respuesta médica.",
        emergency_response: "No hay respuesta oportuna ni protocolos claros ante emergencias.",
      },
      family: {
        respectful_listening: "El trato hacia la persona es habitualmente irrespetuoso o inadecuado.",
        daily_help: "No recibe la ayuda necesaria o hay desatención en tareas esenciales.",
        health_support: "Hay desatención grave en la salud o falta de respuesta médica.",
        emergency_response: "No hay respuesta oportuna ni protocolos claros ante emergencias.",
      },
    },
  },
  privacy: {
    outstanding: {
      resident: {
        room_entry: "Siempre avisan y esperan mi permiso antes de entrar a mi habitación.",
        private_conversations: "Siempre tengo un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios y las reglas facilitan especialmente el contacto con familiares y allegados.",
        personal_objects: "Tengo plena libertad para llevar objetos personales y decorar mi dormitorio.",
      },
      family: {
        room_entry: "Siempre avisan y esperan permiso antes de entrar a su habitación.",
        private_conversations: "Siempre cuenta con un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios y las reglas facilitan especialmente el contacto y las visitas.",
        personal_objects: "Tiene plena libertad para llevar objetos personales y decorar su dormitorio.",
      },
    },
    good: {
      resident: {
        room_entry: "En general avisan y piden permiso antes de entrar a mi habitación.",
        private_conversations: "Habitualmente tengo privacidad para conversar o recibir visitas.",
        visit_rules: "Los horarios y las reglas permiten mantener el contacto con familiares y allegados.",
        personal_objects: "Puedo llevar objetos personales y decorar mi dormitorio, con algunas limitaciones.",
      },
      family: {
        room_entry: "En general avisan y piden permiso antes de entrar a su habitación.",
        private_conversations: "Habitualmente cuenta con privacidad para conversar o recibir visitas.",
        visit_rules: "Los horarios y las reglas permiten mantener el contacto y las visitas.",
        personal_objects: "Puede llevar objetos personales y decorar su dormitorio, con algunas limitaciones.",
      },
    },
    requires_improvement: {
      resident: {
        room_entry: "A veces entran a mi habitación sin avisar o sin esperar mi permiso.",
        private_conversations: "No siempre tengo suficiente privacidad para conversar o recibir visitas.",
        visit_rules: "Algunos horarios o reglas dificultan el contacto con familiares y allegados.",
        personal_objects: "Tengo pocas posibilidades de llevar objetos personales o decorar mi dormitorio.",
      },
      family: {
        room_entry: "A veces entran a su habitación sin avisar o sin esperar permiso.",
        private_conversations: "No siempre cuenta con suficiente privacidad para conversar o recibir visitas.",
        visit_rules: "Algunos horarios o reglas dificultan el contacto y las visitas.",
        personal_objects: "Tiene pocas posibilidades de llevar objetos personales o decorar su dormitorio.",
      },
    },
    inadequate: {
      resident: {
        room_entry: "Entran a mi habitación sin avisar ni pedirme permiso.",
        private_conversations: "No tengo un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios o las reglas restringen mucho el contacto con familiares y allegados.",
        personal_objects: "No me permiten llevar objetos personales o decorar mi dormitorio.",
      },
      family: {
        room_entry: "Entran a su habitación sin avisar ni pedir permiso.",
        private_conversations: "No cuenta con un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios o las reglas restringen mucho el contacto y las visitas.",
        personal_objects: "No le permiten llevar objetos personales o decorar su dormitorio.",
      },
    },
  },
  daily_decisions: {
    outstanding: {
      resident: {
        activities: "Puedo elegir libremente mis horarios, actividades y talleres recreativos.",
        rest: "Se respetan plenamente mis tiempos de descanso, sueño y tranquilidad.",
        menu: "La comida es variada, de excelente calidad y puedo opinar o elegir opciones de menú.",
      },
      family: {
        activities: "Puede elegir libremente sus horarios, actividades y talleres recreativos.",
        rest: "Se respetan plenamente sus tiempos de descanso, sueño y tranquilidad.",
        menu: "La comida es variada, de excelente calidad y se contemplan sus preferencias.",
      },
    },
    good: {
      resident: {
        activities: "En general puedo participar en actividades y talleres de mi interés.",
        rest: "Habitualmente se respetan mis horarios de descanso.",
        menu: "La comida es adecuada y se toman en cuenta mis preferencias.",
      },
      family: {
        activities: "En general puede participar en actividades y talleres de su interés.",
        rest: "Habitualmente se respetan sus horarios de descanso.",
        menu: "La comida es adecuada y se toman en cuenta sus preferencias.",
      },
    },
    requires_improvement: {
      resident: {
        activities: "Hay pocas actividades recreativas o no se adaptan a lo que me gusta.",
        rest: "A veces no se respetan mis horarios de descanso o hay ruidos molestos.",
        menu: "El menú es poco variado o no se toman en cuenta sugerencias ni gustos.",
      },
      family: {
        activities: "Hay pocas actividades recreativas o no se adaptan a lo que le gusta.",
        rest: "A veces no se respetan sus horarios de descanso o hay ruidos molestos.",
        menu: "El menú es poco variado o no se toman en cuenta sugerencias ni gustos.",
      },
    },
    inadequate: {
      resident: {
        activities: "No hay actividades disponibles o se impone una rutina obligatoria.",
        rest: "Se imponen horarios rígidos sin respetar el descanso individual.",
        menu: "La alimentación es deficiente, escasa o inadecuada para la salud.",
      },
      family: {
        activities: "No hay actividades disponibles o se impone una rutina obligatoria.",
        rest: "Se imponen horarios rígidos sin respetar el descanso individual.",
        menu: "La alimentación es deficiente, escasa o inadecuada para la salud.",
      },
    },
  },
  spaces_accessibility: {
    outstanding: {
      resident: {
        light_ventilation: "Los ambientes tienen excelente luz natural y ventilación constante.",
        temperature: "La temperatura del lugar es siempre agradable y confortable en toda época.",
        bathrooms: "Los baños son amplios, seguros, impecables y totalmente accesibles.",
        circulation: "Es muy fácil y seguro circular por todo el residencial (pasillos, rampas, patio).",
      },
      family: {
        light_ventilation: "Los ambientes tienen excelente luz natural y ventilación constante.",
        temperature: "La temperatura del lugar es siempre agradable y confortable en toda época.",
        bathrooms: "Los baños son amplios, seguros, impecables y totalmente accesibles.",
        circulation: "Es muy fácil y seguro circular por todo el residencial (pasillos, rampas, patio).",
      },
    },
    good: {
      resident: {
        light_ventilation: "La ventilación y la iluminación natural son adecuadas.",
        temperature: "La calefacción y refrigeración mantienen ambientes templados en general.",
        bathrooms: "Los baños están limpios, en buenas condiciones y con adaptaciones básicas.",
        circulation: "Los espacios de circulación están despejados y permiten moverse bien.",
      },
      family: {
        light_ventilation: "La ventilación y la iluminación natural son adecuadas.",
        temperature: "La calefacción y refrigeración mantienen ambientes templados en general.",
        bathrooms: "Los baños están limpios, en buenas condiciones y con adaptaciones básicas.",
        circulation: "Los espacios de circulación están despejados y permiten moverse bien.",
      },
    },
    requires_improvement: {
      resident: {
        light_ventilation: "Falta ventilación o luz natural en algunos dormitorios o áreas comunes.",
        temperature: "Los ambientes suelen ser fríos en invierno o calurosos en verano.",
        bathrooms: "Los baños presentan dificultades de accesibilidad, falta de barras o mantenimiento.",
        circulation: "Hay pasillos estrechos, desniveles o trabas que dificultan la circulación.",
      },
      family: {
        light_ventilation: "Falta ventilación o luz natural en algunos dormitorios o áreas comunes.",
        temperature: "Los ambientes suelen ser fríos en invierno o calurosos en verano.",
        bathrooms: "Los baños presentan dificultades de accesibilidad, falta de barras o mantenimiento.",
        circulation: "Hay pasillos estrechos, desniveles o trabas que dificultan la circulación.",
      },
    },
    inadequate: {
      resident: {
        light_ventilation: "Ambientes oscuros, con humedad o sin ventilación adecuada.",
        temperature: "Falta de calefacción o condiciones térmicas extremas.",
        bathrooms: "Baños rotos, inaccesibles, sucios o insuficientes para la cantidad de personas.",
        circulation: "Espacios peligrosos, con riesgo de caídas o barreras físicas graves.",
      },
      family: {
        light_ventilation: "Ambientes oscuros, con humedad o sin ventilación adecuada.",
        temperature: "Falta de calefacción o condiciones térmicas extremas.",
        bathrooms: "Baños rotos, inaccesibles, sucios o insuficientes para la cantidad de personas.",
        circulation: "Espacios peligrosos, con riesgo de caídas o barreras físicas graves.",
      },
    },
  },
  information_agreements: {
    outstanding: {
      resident: {
        medical_direction: "La información sobre la dirección técnica médica y profesionales siempre está disponible.",
        contract_costs: "El contrato, los costos y los servicios incluidos son totalmente claros y detallados.",
        before_signing: "Antes de ingresar me explicaron todo con tiempo, claridad y sin presiones.",
        documents_money: "El manejo acordado de dinero y documentos personales es totalmente confiable y documentado.",
      },
      family: {
        medical_direction: "La información sobre la dirección técnica médica y profesionales siempre está disponible.",
        contract_costs: "El contrato, los costos y los servicios incluidos son totalmente claros y detallados.",
        before_signing: "Antes de firmar nos explicaron todo con tiempo, claridad y sin presiones.",
        documents_money: "El manejo acordado de dinero y documentos personales es totalmente confiable y documentado.",
      },
    },
    good: {
      resident: {
        medical_direction: "Se conoce quién es la dirección técnica médica y cómo contactarla.",
        contract_costs: "Los costos y el contrato son claros y se cumplen en general.",
        before_signing: "Se brindó información suficiente antes de la firma del contrato.",
        documents_money: "El manejo de documentos y dinero personal es correcto y ordenado.",
      },
      family: {
        medical_direction: "Se conoce quién es la dirección técnica médica y cómo contactarla.",
        contract_costs: "Los costos y el contrato son claros y se cumplen en general.",
        before_signing: "Se brindó información suficiente antes de la firma del contrato.",
        documents_money: "El manejo de documentos y dinero personal es correcto y ordenado.",
      },
    },
    requires_improvement: {
      resident: {
        medical_direction: "Hay poca información sobre la presencia o contacto de la dirección técnica médica.",
        contract_costs: "Hay costos imprevistos o aspectos del contrato poco claros.",
        before_signing: "La información brindada antes de ingresar fue incompleta o apresurada.",
        documents_money: "Falta claridad o rendición en el manejo de dinero o trámites.",
      },
      family: {
        medical_direction: "Hay poca información sobre la presencia o contacto de la dirección técnica médica.",
        contract_costs: "Hay costos imprevistos o aspectos del contrato poco claros.",
        before_signing: "La información brindada antes de firmar fue incompleta o apresurada.",
        documents_money: "Falta claridad o rendición en el manejo de dinero o trámites.",
      },
    },
    inadequate: {
      resident: {
        medical_direction: "No se informa ni se conoce a la dirección técnica médica responsable.",
        contract_costs: "Se cobran cargos no acordados o no se entrega copia del contrato.",
        before_signing: "Hubo omisión de información relevante o engaño previo al ingreso.",
        documents_money: "Retención indebida de documentos, tarjetas o dinero personal.",
      },
      family: {
        medical_direction: "No se informa ni se conoce a la dirección técnica médica responsable.",
        contract_costs: "Se cobran cargos no acordados o no se entrega copia del contrato.",
        before_signing: "Hubo omisión de información relevante o engaño previo a la firma.",
        documents_money: "Retención indebida de documentos, tarjetas o dinero personal.",
      },
    },
  },
};

export function getBriefExperienceAspects(sectionId, rating, relationshipType = "resident") {
  if (!rating || rating === "unrated") return [];
  const section = SECTION_BY_ID.get(sectionId);
  if (!section) return [];
  const perspective = relationshipType === "resident" ? "resident" : "family";
  const map = DYNAMIC_ASPECT_LABELS[sectionId]?.[rating]?.[perspective] || {};
  return section.aspects.map(([id, defaultLabel]) => [id, map[id] || defaultLabel]);
}

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

export function briefExperienceSituationTitle(rating) {
  return {
    outstanding: "Funciona siempre o de forma especialmente buena. ¿Qué se destaca especialmente?",
    good: "En general funciona bien. ¿Qué funciona bien en general?",
    requires_improvement: "Hay dificultades que deberían corregirse. ¿Qué debería mejorar?",
    inadequate: "No se cumple o existen problemas graves. ¿Qué situaciones resultan inadecuadas?",
  }[rating] || "Aspectos a considerar";
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
