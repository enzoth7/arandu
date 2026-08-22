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
      ["personal_care", "La posibilidad de decidir sobre el cuidado personal y la vestimenta"],
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
        respectful_listening: "Me tratan con mucho respeto, me escuchan con atención y toman en cuenta lo que digo.",
        daily_help: "La ayuda llega rápidamente, sin que tenga que insistir.",
        health_support: "Cuando tengo una necesidad de salud, me atienden con rapidez y me explican qué van a hacer.",
        emergency_response: "Ante una emergencia, el personal actúa de inmediato y de manera organizada.",
      },
      family: {
        respectful_listening: "La tratan con mucho respeto, la escuchan con atención y toman en cuenta lo que dice.",
        daily_help: "La ayuda llega rápidamente, sin que la persona o quienes la acompañan tengan que insistir.",
        health_support: "Cuando surge una necesidad de salud, la atienden con rapidez y explican qué van a hacer.",
        emergency_response: "Ante una emergencia, el personal actúa de inmediato y de manera organizada.",
      },
    },
    good: {
      resident: {
        respectful_listening: "En general me tratan con respeto, me escuchan y tienen en cuenta lo que digo.",
        daily_help: "La ayuda llega cuando la necesito.",
        health_support: "Mis necesidades de salud reciben una respuesta adecuada.",
        emergency_response: "El personal sabe cómo actuar ante una emergencia.",
      },
      family: {
        respectful_listening: "En general la tratan con respeto, la escuchan y tienen en cuenta lo que dice.",
        daily_help: "La ayuda llega cuando la persona la necesita.",
        health_support: "Sus necesidades de salud reciben una respuesta adecuada.",
        emergency_response: "El personal sabe cómo actuar ante una emergencia.",
      },
    },
    requires_improvement: {
      resident: {
        respectful_listening: "El trato, la escucha o la consideración de lo que digo deberían mejorar.",
        daily_help: "A veces tengo que pedir ayuda más de una vez o esperar demasiado.",
        health_support: "La respuesta ante una necesidad de salud podría ser más rápida o más clara.",
        emergency_response: "La actuación ante emergencias debería estar mejor organizada.",
      },
      family: {
        respectful_listening: "El trato, la escucha o la consideración de lo que dice deberían mejorar.",
        daily_help: "A veces hay que pedir ayuda más de una vez o esperar demasiado.",
        health_support: "La respuesta ante una necesidad de salud podría ser más rápida o más clara.",
        emergency_response: "La actuación ante emergencias debería estar mejor organizada.",
      },
    },
    inadequate: {
      resident: {
        respectful_listening: "No me tratan con respeto, no me escuchan ni tienen en cuenta lo que digo.",
        daily_help: "La ayuda no llega cuando la necesito.",
        health_support: "Mis necesidades de salud no reciben una respuesta adecuada.",
        emergency_response: "Ante una emergencia, el personal no actúa de manera adecuada.",
      },
      family: {
        respectful_listening: "No la tratan con respeto, no la escuchan ni tienen en cuenta lo que dice.",
        daily_help: "La ayuda no llega cuando la persona la necesita.",
        health_support: "Sus necesidades de salud no reciben una respuesta adecuada.",
        emergency_response: "Ante una emergencia, el personal no actúa de manera adecuada.",
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
        visit_rules: "Los horarios y las reglas permiten mantener el contacto con familiares y personas allegadas.",
        personal_objects: "Puede llevar objetos personales y decorar su dormitorio, con algunas limitaciones.",
      },
    },
    requires_improvement: {
      resident: {
        room_entry: "A veces entran a mi habitación sin avisar o sin esperar mi permiso.",
        private_conversations: "No siempre tengo suficiente privacidad para conversar o recibir visitas.",
        visit_rules: "Algunos horarios o reglas dificultan el contacto con familiares y personas allegadas.",
        personal_objects: "Tengo pocas posibilidades de llevar objetos personales o decorar mi dormitorio.",
      },
      family: {
        room_entry: "A veces entran a su habitación sin avisar o sin esperar permiso.",
        private_conversations: "No siempre cuenta con suficiente privacidad para conversar o recibir visitas.",
        visit_rules: "Algunos horarios o reglas dificultan el contacto con familiares y personas allegadas.",
        personal_objects: "Tiene pocas posibilidades de llevar objetos personales o decorar su dormitorio.",
      },
    },
    inadequate: {
      resident: {
        room_entry: "Entran a mi habitación sin avisar ni pedirme permiso.",
        private_conversations: "No tengo un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios o las reglas restringen mucho el contacto con familiares y personas allegadas.",
        personal_objects: "No me permiten llevar objetos personales o decorar mi dormitorio.",
      },
      family: {
        room_entry: "Entran a su habitación sin avisar ni pedir permiso.",
        private_conversations: "No cuenta con un espacio privado para conversar o recibir visitas.",
        visit_rules: "Los horarios o las reglas restringen mucho el contacto con familiares y personas allegadas.",
        personal_objects: "No le permiten llevar objetos personales o decorar su dormitorio.",
      },
    },
  },
  daily_decisions: {
    outstanding: {
      resident: {
        activities: "Participo de forma frecuente y real en las decisiones sobre las actividades.",
        rest: "Las actividades son variadas y se adaptan especialmente bien a mis gustos y posibilidades.",
        menu: "Siempre respetan cuando quiero descansar, estar a solas o no participar.",
        personal_care: "Participo en las decisiones sobre el menú; está a la vista y tiene muy en cuenta mis necesidades y gustos.",
      },
      family: {
        activities: "Participa de forma frecuente y real en las decisiones sobre las actividades.",
        rest: "Las actividades son variadas y se adaptan especialmente bien a sus gustos y posibilidades.",
        menu: "Siempre respetan cuando quiere descansar, estar a solas o no participar.",
        personal_care: "Participa en las decisiones sobre el menú; está a la vista y tiene muy en cuenta sus necesidades y gustos.", 
      },
    },
    good: {
      resident: {
        activities: "Puedo opinar sobre las actividades.",
        rest: "En general, las actividades son variadas y se adaptan a mis gustos y posibilidades.",
        menu: "En general, respetan cuando quiero descansar, estar a solas o no participar.",
        personal_care: "Puedo opinar sobre el menú; suele estar a la vista y tiene en cuenta mis necesidades y gustos.",
      },
      family: {
        activities: "Puede opinar sobre las actividades.",
        rest: "En general, las actividades son variadas y se adaptan a sus gustos y posibilidades.",
        menu: "En general, respetan cuando quiere descansar, estar a solas o no participar.",
        personal_care: "Puede opinar sobre el menú; suele estar a la vista y tiene en cuenta sus necesidades y gustos.",
      },
    },
    requires_improvement: {
      resident: {
        activities: "Tengo pocas oportunidades para opinar sobre las actividades.",
        rest: "Las actividades no siempre se adaptan a mis gustos o posibilidades.",
        menu: "A veces insisten cuando quiero descansar, estar a solas o no participar.",
        personal_care: "Tengo pocas oportunidades para opinar sobre el menú, o no siempre está visible ni contempla mis necesidades y gustos.",  
      },
      family: {
        activities: "Tiene pocas oportunidades para opinar sobre las actividades.",
        rest: "Las actividades no siempre se adaptan a sus gustos o posibilidades.",
        menu: "A veces insisten cuando quiere descansar, estar a solas o no participar.",
        personal_care: "Tiene pocas oportunidades para opinar sobre el menú, o no siempre está visible ni contempla sus necesidades y gustos.",
      },
    },
    inadequate: {
      resident: {
        activities: "No puedo participar en decisiones sobre las actividades.",
        rest: "Las actividades no se adaptan a mis gustos o posibilidades.",
        menu: "No respetan cuando quiero descansar, estar a solas o no participar.",
        personal_care: "No puedo opinar sobre el menú, y no está visible o no contempla mis necesidades y gustos.",
      },
      family: {
        activities: "No puede participar en decisiones sobre las actividades.",
        rest: "Las actividades no se adaptan a sus gustos o posibilidades.",
        menu: "No respetan cuando quiere descansar, estar a solas o no participar.",
        personal_care: "No puede opinar sobre el menú, y no está visible o no contempla sus necesidades y gustos.",
      },
    },
  },
  spaces_accessibility: {
    outstanding: {
      resident: {
        light_ventilation: "Los espacios tienen muy buena ventilación, luz natural y una temperatura agradable.",
        temperature: "Hay suficiente espacio en las habitaciones y entre las camas.",
        bathrooms: "Los baños son suficientes, accesibles y fáciles de usar.",
        circulation: "Puedo circular con comodidad y seguridad.",
      },
      family: {
        light_ventilation: "Los espacios que usa tienen muy buena ventilación, luz natural y una temperatura agradable.",
        temperature: "Hay suficiente espacio en las habitaciones y entre las camas.",
        bathrooms: "Los baños son suficientes, accesibles y fáciles de usar.",
        circulation: "Puede circular con comodidad y seguridad.",
      },
    },
    good: {
      resident: {
        light_ventilation: "En general, los espacios tienen ventilación, luz natural y una temperatura adecuada.",
        temperature: "Los baños son suficientes y accesibles en la mayoría de las situaciones.",
        bathrooms: "En general puedo circular con seguridad.",
        circulation: "Las habitaciones tienen espacio suficiente para moverse.",
      },
      family: {
        light_ventilation: "En general, los espacios que usa tienen ventilación, luz natural y una temperatura adecuada.",
        temperature: "Los baños son suficientes y accesibles en la mayoría de las situaciones.",
        bathrooms: "En general puede circular con seguridad.",
        circulation: "Las habitaciones tienen espacio suficiente para moverse.",
      },
    },
    requires_improvement: {
      resident: {
        light_ventilation: "La ventilación, la luz natural o la temperatura de algunos espacios deberían mejorar.",
        temperature: "La cantidad o la accesibilidad de los baños debería mejorar.",
        bathrooms: "Hay zonas en las que me cuesta circular con seguridad.",
        circulation: "En algunas habitaciones falta espacio para moverse.",
      },
      family: {
        light_ventilation: "La ventilación, la luz natural o la temperatura de algunos espacios deberían mejorar.",
        temperature: "La cantidad o la accesibilidad de los baños debería mejorar.",
        bathrooms: "Hay zonas en las que le cuesta circular con seguridad.",
        circulation: "En algunas habitaciones falta espacio para moverse.",
      },
    },
    inadequate: {
      resident: {
        light_ventilation: "Los espacios no tienen ventilación, luz natural o una temperatura adecuada.",
        temperature: "No hay suficientes baños o no son accesibles.",
        bathrooms: "No puedo circular con seguridad por el lugar.",
        circulation: "Las habitaciones no tienen espacio suficiente para moverse.",
      },
      family: {
        light_ventilation: "Los espacios que usa no tienen ventilación, luz natural o una temperatura adecuada.",
        temperature: "No hay suficientes baños o no son accesibles.",
        bathrooms: "No puede circular con seguridad por el lugar.",
        circulation: "Las habitaciones no tienen espacio suficiente para moverse.",
      },
    },
  },
  information_agreements: {
    outstanding: {
      resident: {
        medical_direction: "Sé claramente quién está a cargo de la dirección técnica médica y cómo contactarla.",
        contract_costs: "El contrato explica con mucha claridad los servicios, los costos, la forma de pago, los derechos y las obligaciones.",
        before_signing: "Antes de pedir una firma o un consentimiento, explican todo de forma comprensible; puedo preguntar, pedir una copia y tomarme el tiempo que necesito.",
        documents_money: "Puedo acceder a mis documentos y recibo información completa sobre cómo se administra mi dinero.",
      },
      family: {
        medical_direction: "La persona y sus referentes saben claramente quién está a cargo de la dirección técnica médica y cómo contactarla.",
        contract_costs: "El contrato explica con mucha claridad los servicios, los costos, la forma de pago, los derechos y las obligaciones.",
        before_signing: "Antes de pedir una firma o un consentimiento, explican todo de forma comprensible; se puede preguntar, pedir una copia y tomarse el tiempo necesario.",
        documents_money: "La persona puede acceder a sus documentos y recibe información completa sobre cómo se administra su dinero.",
      },
    },
    good: {
      resident: {
        medical_direction: "Sé quién está a cargo de la dirección técnica médica y cómo contactarla.",
        contract_costs: "El contrato explica los servicios, los costos, la forma de pago y los principales derechos y obligaciones.",
        before_signing: "Antes de pedir una firma o un consentimiento, dan una explicación comprensible y puedo hacer preguntas o pedir una copia.",
        documents_money: "Puedo acceder a mis documentos y recibo información clara sobre cómo se administra mi dinero.",
      },
      family: {
        medical_direction: "La persona y sus referentes saben quién está a cargo de la dirección técnica médica y cómo contactarla.",
        contract_costs: "El contrato explica los servicios, los costos, la forma de pago y los principales derechos y obligaciones.",
        before_signing: "Antes de pedir una firma o un consentimiento, dan una explicación comprensible y se pueden hacer preguntas o pedir una copia.",
        documents_money: "La persona puede acceder a sus documentos y recibe información clara sobre cómo se administra su dinero.",
      },
    },
    requires_improvement: {
      resident: {
        medical_direction: "La información sobre la dirección técnica médica es incompleta o cuesta saber cómo contactarla.",
        contract_costs: "Algunas partes del contrato, los costos o la forma de pago no son suficientemente claras.",
        before_signing: "Las explicaciones antes de firmar son incompletas, o cuesta hacer preguntas, obtener una copia o tener tiempo para revisar.",
        documents_money: "El acceso a mis documentos o la información sobre mi dinero no siempre es claro.",
      },
      family: {
        medical_direction: "La información sobre la dirección técnica médica es incompleta o cuesta saber cómo contactarla.",
        contract_costs: "Algunas partes del contrato, los costos o la forma de pago no son suficientemente claras.",
        before_signing: "Las explicaciones antes de firmar son incompletas, o cuesta hacer preguntas, obtener una copia o tener tiempo para revisar.",
        documents_money: "El acceso de la persona a sus documentos o la información sobre su dinero no siempre es claro.",
      },
    },
    inadequate: {
      resident: {
        medical_direction: "No sé quién está a cargo de la dirección técnica médica ni cómo contactarla.",
        contract_costs: "El contrato no explica con claridad los servicios, los costos, la forma de pago, los derechos o las obligaciones.",
        before_signing: "Me piden una firma o un consentimiento sin una explicación comprensible, sin responder preguntas o sin darme una copia y tiempo para revisar.",
        documents_money: "No puedo acceder a mis documentos o no recibo información clara sobre cómo se administra mi dinero.",
      },
      family: {
        medical_direction: "No se informa quién está a cargo de la dirección técnica médica ni cómo contactarla.",
        contract_costs: "El contrato no explica con claridad los servicios, los costos, la forma de pago, los derechos o las obligaciones.",
        before_signing: "Se pide una firma o un consentimiento sin una explicación comprensible, sin responder preguntas o sin entregar una copia y tiempo para revisar.",
        documents_money: "La persona no puede acceder a sus documentos o no recibe información clara sobre cómo se administra su dinero.",
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
    outstanding: "¿Qué se destaca especialmente?",
    good: "¿Qué funciona bien en general?",
    requires_improvement: "¿Qué debería mejorar?",
    inadequate: "¿Qué situaciones resultan inadecuadas?",
  }[rating] || "";
}

export function briefExperienceSituationTitle(rating) {
  return {
    outstanding: "¿Qué se destaca especialmente?",
    good: "¿Qué funciona bien en general?",
    requires_improvement: "¿Qué debería mejorar?",
    inadequate: "¿Qué situaciones resultan inadecuadas?",
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
