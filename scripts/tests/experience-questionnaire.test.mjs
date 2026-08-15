import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPERIENCE_DIMENSIONS,
  EXPERIENCE_DRAFT_TTL_MS,
  EXPERIENCE_DRAFT_VERSION,
  EXPERIENCE_QUESTIONNAIRE_VERSION,
  EXPERIENCE_QUESTIONS,
  EXPERIENCE_QUESTION_BY_ID,
  EXPERIENCE_SCALE_OPTIONS,
  EXPERIENCE_SCORING_VERSION,
  PARTICIPATION_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESPONDENT_OPTIONS,
  isAnswerAllowedForQuestion,
  sanitizeExperienceDraft,
  scoreExperienceAnswers,
} from "../../lib/experience-questionnaire.mjs";

const EXPECTED_TEXT_PAIRS = [
  [
    "¿Le llaman por su nombre o por el nombre que prefiere?",
    "¿Las personas son llamadas por su nombre o por el nombre que prefieren?",
  ],
  [
    "¿Le preguntan qué quiere y respetan sus decisiones?",
    "¿Se consulta a las personas que viven allí sobre sus preferencias y se respetan sus decisiones?",
  ],
  [
    "¿El personal habla directamente con usted, escucha lo que dice y tiene en cuenta su opinión?",
    "¿El personal habla directamente con las personas que viven allí, escucha lo que dicen y tiene en cuenta sus opiniones?",
  ],
  [
    "¿Tiene oportunidades reales de hacer sugerencias y participar en decisiones del establecimiento?",
    "¿Las personas que viven allí tienen oportunidades reales de hacer sugerencias y participar en decisiones del establecimiento?",
  ],
  [
    "¿La ubicación del establecimiento le permite mantener sus vínculos y llegar a lugares importantes para usted?",
    "¿La ubicación permite que las personas que viven allí mantengan sus vínculos y lleguen a lugares importantes para ellas?",
  ],
  [
    "¿Los horarios de visita y las reglas del establecimiento facilitan el contacto con familiares y personas allegadas?",
    "¿Los horarios de visita y las reglas del establecimiento facilitan el contacto de las personas que viven allí con familiares y personas allegadas?",
  ],
  [
    "¿Dispone de medios de comunicación y de un espacio privado para hablar por teléfono o recibir visitas?",
    "¿Las personas que viven allí disponen de medios de comunicación y de un espacio privado para hablar por teléfono o recibir visitas?",
  ],
  [
    "¿Las actividades son variadas y se adaptan a sus gustos, intereses y posibilidades?",
    "¿Las actividades son variadas y se adaptan a los gustos, intereses y posibilidades de cada persona?",
  ],
  [
    "¿Se respeta cuando decide descansar, estar a solas o no participar en una actividad?",
    "¿Se respeta cuando una persona decide descansar, estar a solas o no participar en una actividad?",
  ],
  [
    "¿El menú está a la vista y tiene en cuenta sus necesidades y gustos?",
    "¿El menú está a la vista y tiene en cuenta las necesidades y gustos de cada persona?",
  ],
  [
    "¿Puede entrar, salir y comunicarse con el exterior con los apoyos que necesita?",
    "¿Las personas que viven allí pueden entrar, salir y comunicarse con el exterior con los apoyos que necesitan?",
  ],
  [
    "¿Se respeta su intimidad durante la higiene y el uso del baño?",
    "¿Se respeta la intimidad de las personas que viven allí durante la higiene y el uso del baño?",
  ],
  [
    "¿Le avisan y le piden permiso antes de entrar a su habitación?",
    "¿Avisan y piden permiso antes de entrar a las habitaciones de las personas que viven allí?",
  ],
  [
    "¿Tiene un lugar propio y seguro para guardar sus objetos personales?",
    "¿Cada persona tiene un lugar propio y seguro para guardar sus objetos personales?",
  ],
  [
    "¿Tiene privacidad para recibir visitas y mantener conversaciones?",
    "¿Las personas que viven allí tienen privacidad para recibir visitas y mantener conversaciones?",
  ],
  [
    "¿Su dormitorio y los baños están libres de cámaras de videovigilancia?",
    "¿Los dormitorios y los baños están libres de cámaras de videovigilancia?",
  ],
  [
    "¿Le informan y le piden permiso antes de usar imágenes suyas o compartir su información personal?",
    "¿Se informa y se pide permiso a las personas que viven allí antes de usar sus imágenes o compartir su información personal?",
  ],
  [
    "¿Los espacios tienen buena ventilación, luz natural y una temperatura adecuada?",
    "¿Los espacios que usan las personas que viven allí tienen buena ventilación, luz natural y una temperatura adecuada?",
  ],
  [
    "¿Puede circular de forma segura y hay suficiente espacio entre las camas?",
    "¿Las personas que viven allí pueden circular de forma segura y hay suficiente espacio entre las camas?",
  ],
  [
    "¿Hay suficientes baños y son accesibles para usted?",
    "¿Hay suficientes baños y son accesibles para las personas que viven allí?",
  ],
  [
    "¿Puede abrir la puerta de su habitación desde adentro y está libre de trancas o candados externos?",
    "¿Las personas que viven allí pueden abrir las puertas de sus habitaciones desde adentro y están libres de trancas o candados externos?",
  ],
  [
    "¿Tiene libertad para llevar objetos personales y decorar su dormitorio como le gusta?",
    "¿Las personas que viven allí tienen libertad para llevar objetos personales y decorar sus dormitorios como les gusta?",
  ],
  [
    "¿Le permitieron conocer las instalaciones y le explicaron cómo está organizado el establecimiento?",
    "¿La persona responsable permitió conocer las instalaciones y explicó cómo está organizado el establecimiento?",
  ],
  [
    "¿Sabe quién está a cargo de la dirección técnica médica y cómo contactarla?",
    "¿Las personas que viven allí y sus referentes reciben información clara sobre quién está a cargo de la dirección técnica médica y cómo contactarla?",
  ],
  [
    "Cuando necesita ayuda o surge una emergencia, ¿el personal sabe cómo actuar?",
    "Cuando una persona necesita ayuda o surge una emergencia, ¿el personal sabe cómo actuar?",
  ],
  [
    "¿Su medicación se guarda de forma segura y ordenada?",
    "¿La medicación de las personas que viven allí se guarda de forma segura y ordenada?",
  ],
  [
    "¿El contrato explica con claridad qué servicios incluye, cuánto cuestan, cómo se pagan y cuáles son sus derechos y obligaciones?",
    "¿El contrato explica con claridad qué servicios incluye, cuánto cuestan, cómo se pagan y cuáles son los derechos y obligaciones?",
  ],
  [
    "Antes de pedirle que firme, ¿le explican el contrato y el consentimiento de forma comprensible?",
    "Antes de solicitar una firma, ¿se explican el contrato y el consentimiento de forma comprensible?",
  ],
  [
    "¿Puede acceder a sus documentos personales y recibe información clara sobre cómo se administra su dinero?",
    "¿Las personas que viven allí pueden acceder a sus documentos personales y reciben información clara sobre cómo se administra su dinero?",
  ],
  [
    "¿Puede hacer preguntas, pedir una copia y tomarse tiempo para revisar la información antes de decidir o firmar?",
    "¿Las personas pueden hacer preguntas, pedir una copia y tomarse tiempo para revisar la información antes de decidir o firmar?",
  ],
];

test("el catálogo conserva las 30 preguntas exactas del Anexo A en seis dimensiones", () => {
  assert.equal(EXPERIENCE_QUESTIONNAIRE_VERSION, "vcr1-30");
  assert.equal(EXPERIENCE_SCORING_VERSION, "vcr1-dimensions-1");
  assert.deepEqual(EXPERIENCE_DIMENSIONS, [
    { id: "autonomy", title: "Trato, autonomía y participación", order: 1 },
    { id: "daily_life", title: "Vida cotidiana, vínculos y actividades", order: 2 },
    { id: "privacy", title: "Privacidad e intimidad", order: 3 },
    { id: "space", title: "Espacio y accesibilidad", order: 4 },
    { id: "care", title: "Equipo y cuidados", order: 5 },
    { id: "contract", title: "Contrato, costos y documentación", order: 6 },
  ]);
  assert.equal(EXPERIENCE_QUESTIONS.length, 30);
  assert.deepEqual(EXPERIENCE_QUESTIONS.map((question) => question.id),
    Array.from({ length: 30 }, (_, index) => `q${String(index + 1).padStart(2, "0")}`));
  assert.deepEqual(EXPERIENCE_QUESTIONS.map((question) => question.number),
    Array.from({ length: 30 }, (_, index) => index + 1));
  assert.deepEqual(EXPERIENCE_QUESTIONS.map((question) => question.position),
    Array.from({ length: 30 }, (_, index) => index + 1));
  assert.deepEqual(
    EXPERIENCE_DIMENSIONS.map((dimension) => EXPERIENCE_QUESTIONS.filter((question) => question.dimensionId === dimension.id).length),
    [4, 7, 6, 6, 3, 4],
  );
  assert.deepEqual(
    EXPERIENCE_QUESTIONS.map(({ directText, representativeText }) => [directText, representativeText]),
    EXPECTED_TEXT_PAIRS,
  );
  assert.equal(EXPERIENCE_QUESTION_BY_ID.q11.scale, "fulfillment");
  assert.equal(EXPERIENCE_QUESTION_BY_ID.q30.number, 30);
  for (const question of EXPERIENCE_QUESTIONS) {
    assert.equal(EXPERIENCE_QUESTION_BY_ID[question.id], question);
    assert.deepEqual(Object.keys(question), [
      "id", "position", "number", "dimensionId", "scale", "directText", "representativeText", "sourceIds",
    ]);
    assert.ok(question.sourceIds.length > 0);
    assert.ok(question.sourceIds.every((sourceId) => [
      "care_system_2019", "elepem_movement_2026", "arandu_methodology_v1",
    ].includes(sourceId)));
  }
  assert.deepEqual(EXPERIENCE_QUESTION_BY_ID.q01.sourceIds, ["care_system_2019", "elepem_movement_2026"]);
  assert.deepEqual(EXPERIENCE_QUESTION_BY_ID.q05.sourceIds, ["arandu_methodology_v1"]);
});

test("las escalas y opciones usan códigos semánticos estables", () => {
  assert.deepEqual(EXPERIENCE_SCALE_OPTIONS.frequency, [
    { value: "always", label: "Siempre", score: 4 },
    { value: "almost_always", label: "Casi siempre", score: 3 },
    { value: "sometimes", label: "A veces", score: 2 },
    { value: "almost_never", label: "Casi nunca", score: 1 },
    { value: "never", label: "Nunca", score: 0 },
    { value: "unable_to_evaluate", label: "No pude evaluarlo", score: null },
    { value: "not_applicable", label: "No corresponde", score: null },
  ]);
  assert.deepEqual(EXPERIENCE_SCALE_OPTIONS.fulfillment, [
    { value: "yes_completely", label: "Sí, completamente", score: 4 },
    { value: "yes_generally", label: "Sí, en general", score: 3 },
    { value: "partly", label: "En parte", score: 2 },
    { value: "very_little", label: "Muy poco", score: 1 },
    { value: "no", label: "No", score: 0 },
    { value: "unable_to_evaluate", label: "No pude evaluarlo", score: null },
    { value: "not_applicable", label: "No corresponde", score: null },
  ]);
  assert.deepEqual(RELATIONSHIP_OPTIONS.map((option) => option.value), [
    "resident",
    "family_referent_friend_neighbor",
    "caregiver_or_team_member",
    "worker_or_former_worker",
    "linked_person_or_organization",
    "other",
  ]);
  assert.deepEqual(RESPONDENT_OPTIONS.map((option) => option.value), [
    "current_resident",
    "former_resident",
    "family_or_close_person",
    "other_direct_experience",
    "prefer_not_to_say",
  ]);
  assert.deepEqual(PARTICIPATION_OPTIONS.map((option) => option.value), [
    "direct",
    "with_support",
    "jointly_discussed",
    "did_not_participate",
    "not_applicable",
    "prefer_not_to_answer",
  ]);

  for (const question of EXPERIENCE_QUESTIONS) {
    for (const option of EXPERIENCE_SCALE_OPTIONS[question.scale]) {
      assert.equal(isAnswerAllowedForQuestion(question.id, option.value), true);
      assert.equal(isAnswerAllowedForQuestion(question, option.value), true);
    }
    assert.equal(
      isAnswerAllowedForQuestion(question.id, question.scale === "frequency" ? "yes_completely" : "always"),
      false,
    );
  }
  assert.equal(isAnswerAllowedForQuestion("q99", "always"), false);
  assert.equal(isAnswerAllowedForQuestion("q01", 4), false);
});

test("el puntaje se calcula sólo por dimensión y distingue exclusiones de faltantes", () => {
  const result = scoreExperienceAnswers({
    q01: "always",
    q02: "always",
    q03: "almost_always",
    q04: "unable_to_evaluate",
    q05: "yes_generally",
    q06: "almost_always",
    q07: "not_applicable",
    q08: "yes_completely",
    q12: "sometimes",
    q13: "unable_to_evaluate",
    q18: "very_little",
    q24: "unable_to_evaluate",
    q27: "no",
    q28: "yes_completely",
    unknown: "always",
  });

  assert.deepEqual(Object.keys(result), ["autonomy", "daily_life", "privacy", "space", "care", "contract"]);
  assert.deepEqual(result.autonomy, {
    sum: 11,
    scoredCount: 3,
    excludedCount: 1,
    missingCount: 0,
    average: 3.67,
    category: "outstanding",
  });
  assert.deepEqual(result.daily_life, {
    sum: 6,
    scoredCount: 2,
    excludedCount: 1,
    missingCount: 4,
    average: 3,
    category: "good",
  });
  assert.deepEqual(result.privacy, {
    sum: 2,
    scoredCount: 1,
    excludedCount: 1,
    missingCount: 4,
    average: 2,
    category: "requires_improvement",
  });
  assert.deepEqual(result.space, {
    sum: 1,
    scoredCount: 1,
    excludedCount: 0,
    missingCount: 5,
    average: 1,
    category: "inadequate",
  });
  assert.deepEqual(result.care, {
    sum: 0,
    scoredCount: 0,
    excludedCount: 1,
    missingCount: 2,
    average: null,
    category: null,
  });
  assert.deepEqual(result.contract, {
    sum: 4,
    scoredCount: 2,
    excludedCount: 0,
    missingCount: 2,
    average: 2,
    category: "requires_improvement",
  });
  assert.equal(Object.hasOwn(result, "global"), false);
});

test("la categoría usa la precisión completa aunque el promedio se muestre con dos decimales", () => {
  const result = scoreExperienceAnswers({
    q05: "yes_completely",
    q06: "almost_always",
    q07: "almost_always",
    q08: "almost_always",
    q09: "almost_always",
    q10: "almost_always",
    q11: "yes_generally",
  });

  assert.equal(result.daily_life.average, 3.14);
  assert.equal(result.daily_life.category, "good");
});

test("los límites 3,50, 2,50 y 1,50 conservan la categoría prevista", () => {
  const scoreAutonomy = (values) => scoreExperienceAnswers(Object.fromEntries(
    values.map((value, index) => [`q0${index + 1}`, value]),
  )).autonomy;
  const outstanding = scoreAutonomy(["always", "always", "almost_always", "almost_always"]);
  const good = scoreAutonomy(["almost_always", "almost_always", "sometimes", "sometimes"]);
  const requiresImprovement = scoreAutonomy(["sometimes", "sometimes", "almost_never", "almost_never"]);

  assert.deepEqual({ average: outstanding.average, category: outstanding.category }, { average: 3.5, category: "outstanding" });
  assert.deepEqual({ average: good.average, category: good.category }, { average: 2.5, category: "good" });
  assert.deepEqual(
    { average: requiresImprovement.average, category: requiresImprovement.category },
    { average: 1.5, category: "requires_improvement" },
  );
  assert.equal(scoreAutonomy(["almost_never", "almost_never", "almost_never", "almost_never"]).category, "inadequate");
});

test("el borrador v1 dura siete días y elimina PII, texto libre y respuestas inválidas", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");
  const savedAt = new Date(now.getTime() - 60_000).toISOString();
  const draft = sanitizeExperienceDraft({
    version: EXPERIENCE_DRAFT_VERSION,
    savedAt,
    step: 4,
    facilityId: "  REAL-123  ",
    privacyMode: "confidential",
    relationship: "family_referent_friend_neighbor",
    respondentType: "former_resident",
    residentParticipation: "direct",
    answers: {
      q01: "always",
      q05: "yes_generally",
      q06: "yes_generally",
      q30: "not_applicable",
      q99: "always",
    },
    respondent: "current_resident",
    participation: "with_support",
    relationshipOther: "Nombre de una organización",
    narrative: "Texto sensible",
    contact: { name: "Persona", phone: "099000000", email: "persona@example.com" },
    files: ["foto.jpg"],
    consent: true,
  }, now);

  assert.deepEqual(draft, {
    version: 1,
    savedAt,
    step: 4,
    facilityId: "REAL-123",
    privacyMode: "confidential",
    relationship: "family_referent_friend_neighbor",
    respondentType: "former_resident",
    residentParticipation: "direct",
    answers: {
      q01: "always",
      q05: "yes_generally",
      q30: "not_applicable",
    },
  });
  assert.deepEqual(Object.keys(draft).sort(), [
    "answers",
    "facilityId",
    "privacyMode",
    "relationship",
    "residentParticipation",
    "respondentType",
    "savedAt",
    "step",
    "version",
  ]);

  const boundary = new Date(now.getTime() - EXPERIENCE_DRAFT_TTL_MS).toISOString();
  assert.ok(sanitizeExperienceDraft({ version: 1, savedAt: boundary }, now));
  assert.equal(sanitizeExperienceDraft({
    version: 1,
    savedAt: new Date(now.getTime() - EXPERIENCE_DRAFT_TTL_MS - 1).toISOString(),
  }, now), null);
  assert.equal(sanitizeExperienceDraft({ version: 2, savedAt }, now), null);
  assert.equal(sanitizeExperienceDraft({
    version: 1,
    savedAt: new Date(now.getTime() + 1).toISOString(),
  }, now), null);

  const invalidFields = sanitizeExperienceDraft({
    version: 1,
    savedAt,
    step: 10,
    facilityId: " ",
    privacyMode: "Confidencial",
    relationship: "Familiar",
    respondentType: "resident",
    residentParticipation: "directly",
    answers: [],
  }, now);
  assert.deepEqual(invalidFields, { version: 1, savedAt, answers: {} });
});
