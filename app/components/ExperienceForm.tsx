"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  EXPERIENCE_DIMENSIONS,
  EXPERIENCE_DRAFT_VERSION,
  EXPERIENCE_QUESTIONS,
  EXPERIENCE_SCALE_OPTIONS,
  PARTICIPATION_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESPONDENT_OPTIONS,
  sanitizeExperienceDraft,
  scoreExperienceAnswers,
  type ExperienceAnswerValue,
  type ExperienceCategory,
  type ExperienceDimension,
  type ExperiencePrivacyMode,
  type ExperienceQuestionId,
  type ParticipationValue,
  type RelationshipValue,
  type RespondentValue,
} from "../../lib/experience-questionnaire.mjs";
import { URUGUAY_DEPARTMENTS } from "../../lib/uruguay.mjs";
import { PrivateAttachmentFields } from "./PrivateAttachmentFields";
import styles from "./ExperienceForm.module.css";

export type ExperienceFacilityOption = {
  id: string;
  name: string;
  locality: string;
  department: string;
};

type PrivacySelection = ExperiencePrivacyMode | "";
type RequestedDestination = "private_review" | "consider_anonymized";
type Contact = { fullName: string; phone: string; email: string };
type AnswerMap = Partial<Record<ExperienceQuestionId, ExperienceAnswerValue>>;
type FormErrors = Record<string, string>;

const INTRO_TEXT = "Tu experiencia puede ayudar a otras personas. Este cuestionario busca conocer cómo es la vida cotidiana en este establecimiento desde la perspectiva de las personas residentes y de quienes las acompañan. No incluyas nombres, diagnósticos, fotografías ni otros datos que permitan identificar a una persona.";
const DRAFT_STORAGE_KEY = `arandu:experience-draft:v${EXPERIENCE_DRAFT_VERSION}`;
const EMPTY_CONTACT: Contact = { fullName: "", phone: "", email: "" };

const PRIVACY_OPTIONS: ReadonlyArray<{
  value: ExperiencePrivacyMode;
  title: string;
  description: string;
}> = [
  {
    value: "anonymous",
    title: "Anónima",
    description: "No pedimos ni enviamos datos de contacto. Podés solicitar que se considere una versión anonimizada después de la revisión.",
  },
  {
    value: "confidential",
    title: "Confidencial",
    description: "El equipo conserva tus datos de forma privada para contacto y seguimiento. No los comparte con el ELEPEM ni los publica.",
  },
  {
    value: "registered_identity",
    title: "Con identidad registrada",
    description: "El equipo registra los datos que decidas aportar. Cualquier autorización adicional queda sujeta a revisión y nunca se ejecuta automáticamente.",
  },
];

const CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  outstanding: "Sobresaliente",
  good: "Bueno",
  requires_improvement: "Requiere mejoras",
  inadequate: "Inadecuado",
};

const SOURCE_LABELS = {
  care_system_2019: "Sistema de Cuidados (2019)",
  elepem_movement_2026: "Movimiento ELEPEM (2026)",
  arandu_methodology_v1: "Criterio metodológico de Arandú",
} as const;

const RESPONDENT_AUTOFILL: Partial<Record<RelationshipValue, RespondentValue>> = {
  resident: "current_resident",
  family_referent_friend_neighbor: "family_or_close_person",
  caregiver_or_team_member: "other_direct_experience",
  worker_or_former_worker: "other_direct_experience",
};

const STEP_LABELS = [
  "Privacidad",
  "Contexto",
  ...EXPERIENCE_DIMENSIONS.map((dimension) => dimension.title),
  "Revisión",
];
const TOTAL_STEPS = STEP_LABELS.length;

function optionLabel<TValue extends string>(options: readonly { value: TValue; label: string }[], value: TValue | "") {
  return options.find((option) => option.value === value)?.label || "Sin indicar";
}

function privacyLabel(value: PrivacySelection) {
  return PRIVACY_OPTIONS.find((option) => option.value === value)?.title || "Sin elegir";
}

function isDirectRespondent(value: RespondentValue | "") {
  return value === "current_resident";
}

function firstErrorStep(errors: FormErrors) {
  if (["privacyMode", "publicationConsent", "publicName", "shareContact", "phone", "email"].some((key) => errors[key])) return 1;
  if (["facilityId", "relationship", "relationshipOther", "respondentType", "residentParticipation"].some((key) => errors[key])) return 2;
  return 9;
}

function QuestionBlock({
  dimension,
  answers,
  directVersion,
  onAnswer,
  onClear,
}: {
  dimension: ExperienceDimension;
  answers: AnswerMap;
  directVersion: boolean;
  onAnswer: (questionId: ExperienceQuestionId, answer: ExperienceAnswerValue) => void;
  onClear: (questionId: ExperienceQuestionId) => void;
}) {
  const questions = EXPERIENCE_QUESTIONS.filter((question) => question.dimensionId === dimension.id);
  const answered = questions.filter((question) => answers[question.id]).length;

  return <div className={styles.questionBlock}>
    <div className={styles.blockStatus} aria-live="polite">
      <span>{answered} de {questions.length} respondidas en este bloque</span>
      <span>Las preguntas son opcionales</span>
    </div>
    <div className={styles.questionList}>
      {questions.map((question) => {
        const questionText = directVersion ? question.directText : question.representativeText;
        const options = EXPERIENCE_SCALE_OPTIONS[question.scale];
        return <fieldset className={styles.questionCard} key={question.id}>
          <legend>
            <span className={styles.questionNumber}>Pregunta {question.number} de 30</span>
            <span className={styles.questionText}>{questionText}</span>
          </legend>
          <span className={styles.scaleHint}>{question.scale === "frequency" ? "Respondé según la frecuencia" : "Respondé según el grado de cumplimiento"}</span>
          <div className={styles.answerGrid}>
            {options.map((option) => <label className={`${styles.answerOption} ${answers[question.id] === option.value ? styles.selected : ""}`} key={option.value}>
              <input
                type="radio"
                name={`answer-${question.id}`}
                value={option.value}
                checked={answers[question.id] === option.value}
                onChange={() => onAnswer(question.id, option.value)}
              />
              <span>{option.label}</span>
            </label>)}
          </div>
          <div className={styles.questionMeta}>
            <small>Fuente: {question.sourceIds.map((sourceId) => SOURCE_LABELS[sourceId]).join(" · ")}</small>
            {answers[question.id] && <button type="button" onClick={() => onClear(question.id)}>Quitar respuesta</button>}
          </div>
        </fieldset>;
      })}
    </div>
  </div>;
}

export function ExperienceForm({
  facilities,
  initialFacilityId = "",
  enabled,
}: {
  facilities: ExperienceFacilityOption[];
  initialFacilityId?: string;
  enabled: boolean;
}) {
  const initialFacility = facilities.find((facility) => facility.id === initialFacilityId);
  const validInitialFacilityId = initialFacility?.id || "";

  const [step, setStep] = useState(1);
  const [privacyMode, setPrivacyMode] = useState<PrivacySelection>("");
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [requestedDestination, setRequestedDestination] = useState<RequestedDestination>("private_review");
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [futureAuthorizations, setFutureAuthorizations] = useState({ publicName: false, shareContactWithFacility: false });
  const [department, setDepartment] = useState(initialFacility?.department || "");
  const [facilityId, setFacilityId] = useState(validInitialFacilityId);
  const [relationship, setRelationship] = useState<RelationshipValue | "">("");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [respondentType, setRespondentType] = useState<RespondentValue | "">("");
  const [residentParticipation, setResidentParticipation] = useState<ParticipationValue | "">("");
  const [narrative, setNarrative] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("El avance seguro se guarda automáticamente en este navegador durante 7 días.");

  const draftInitializedRef = useRef(false);
  const ignoredDraftSnapshotRef = useRef<string | null>(null);
  const respondentEditedRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(step);

  const departmentFacilities = useMemo(
    () => facilities.filter((facility) => facility.department === department),
    [department, facilities],
  );
  const selectedFacility = useMemo(
    () => facilities.find((facility) => facility.id === facilityId),
    [facilities, facilityId],
  );
  const answeredCount = Object.keys(answers).length;
  const directVersion = isDirectRespondent(respondentType);
  const scorePreview = useMemo(() => scoreExperienceAnswers(answers), [answers]);
  const currentDimension = step >= 3 && step <= 8 ? EXPERIENCE_DIMENSIONS[step - 3] : null;
  const currentPhase = step === 1 ? 1 : step === 2 ? 2 : step <= 8 ? 3 : 4;

  const draftSnapshot = useMemo(() => ({
    version: EXPERIENCE_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    step,
    facilityId: facilityId || undefined,
    privacyMode: privacyMode || undefined,
    relationship: relationship || undefined,
    respondentType: respondentType || undefined,
    residentParticipation: residentParticipation || undefined,
    answers,
  }), [answers, facilityId, privacyMode, relationship, respondentType, residentParticipation, step]);

  useEffect(() => {
    if (draftInitializedRef.current) return;
    draftInitializedRef.current = true;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      let restored: ReturnType<typeof sanitizeExperienceDraft> = null;
      let malformedDraft = false;
      if (raw) {
        try {
          restored = sanitizeExperienceDraft(JSON.parse(raw));
        } catch {
          malformedDraft = true;
        }
      }
      if (raw && !restored) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraftStatus(malformedDraft
          ? "El borrador guardado no era válido y se descartó."
          : "El borrador estaba vencido o era de otra versión y se descartó.");
      }
      if (restored) {
        setStep(Math.min(TOTAL_STEPS, Math.max(1, restored.step || 1)));
        setPrivacyMode(restored.privacyMode || "");
        setRelationship(restored.relationship || "");
        setRespondentType(restored.respondentType || "");
        setResidentParticipation(restored.residentParticipation || "");
        setAnswers(restored.answers);
        if (restored.respondentType) respondentEditedRef.current = true;
        if (!validInitialFacilityId && restored.facilityId) {
          const restoredFacility = facilities.find((facility) => facility.id === restored.facilityId);
          if (restoredFacility) {
            setFacilityId(restoredFacility.id);
            setDepartment(restoredFacility.department);
          }
        }
      }
    } catch {
      setDraftStatus("El guardado automático no está disponible en este navegador. Podés continuar sin guardar.");
    } finally {
      setDraftReady(true);
    }
  }, [facilities, validInitialFacilityId]);

  useEffect(() => {
    if (!draftReady || caseCode) return;
    const serializedSnapshot = JSON.stringify(draftSnapshot);
    if (ignoredDraftSnapshotRef.current === serializedSnapshot) return;
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draftSnapshot, savedAt: new Date().toISOString() }));
      ignoredDraftSnapshotRef.current = null;
    } catch {
      setDraftStatus("El guardado automático no está disponible en este navegador. Podés continuar sin guardar.");
    }
  }, [caseCode, draftReady, draftSnapshot]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors, step]);

  function saveDraftNow() {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draftSnapshot, savedAt: new Date().toISOString() }));
      ignoredDraftSnapshotRef.current = null;
      setDraftStatus("Avance guardado. No se guardaron datos de contacto, texto libre, autorizaciones ni archivos.");
    } catch {
      setDraftStatus("No se pudo guardar el avance en este navegador.");
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      ignoredDraftSnapshotRef.current = JSON.stringify(draftSnapshot);
      setDraftStatus("Borrador borrado. Volverá a guardarse cuando cambies un dato seguro o elijas “Guardar avance”.");
    } catch {
      setDraftStatus("No se pudo borrar el borrador en este navegador.");
    }
  }

  function changePrivacy(next: ExperiencePrivacyMode) {
    setPrivacyMode(next);
    if (next === "anonymous") setContact(EMPTY_CONTACT);
    if (next !== "anonymous") {
      setRequestedDestination("private_review");
      setPublicationConsent(false);
    }
    if (next !== "registered_identity") {
      setFutureAuthorizations({ publicName: false, shareContactWithFacility: false });
    }
    setErrors({});
  }

  function changeRelationship(next: RelationshipValue | "") {
    setRelationship(next);
    if (next !== "other") setRelationshipOther("");
    if (!respondentEditedRef.current) setRespondentType(next ? RESPONDENT_AUTOFILL[next] || "" : "");
  }

  function validatePrivacy() {
    const nextErrors: FormErrors = {};
    if (!privacyMode) nextErrors.privacyMode = "Elegí una modalidad de privacidad.";
    if (privacyMode === "anonymous" && requestedDestination === "consider_anonymized" && !publicationConsent) {
      nextErrors.publicationConsent = "Confirmá la autorización para solicitar una versión anonimizada.";
    }
    if (privacyMode !== "anonymous" && contact.phone.trim() && !/^[+()0-9\s.-]{6,24}$/.test(contact.phone.trim())) {
      nextErrors.phone = "Revisá el teléfono ingresado.";
    }
    if (privacyMode !== "anonymous" && contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      nextErrors.email = "Revisá el correo electrónico ingresado.";
    }
    if (privacyMode === "registered_identity" && futureAuthorizations.publicName && !contact.fullName.trim()) {
      nextErrors.publicName = "Ingresá el nombre completo para autorizar que pueda considerarse su publicación.";
    }
    if (privacyMode === "registered_identity" && futureAuthorizations.shareContactWithFacility && !Object.values(contact).some((value) => value.trim())) {
      nextErrors.shareContact = "Ingresá al menos un dato de contacto para autorizar que pueda compartirse.";
    }
    return nextErrors;
  }

  function validateContext() {
    const nextErrors: FormErrors = {};
    if (!facilityId) nextErrors.facilityId = "Elegí el ELEPEM al que corresponde la experiencia.";
    if (!relationship) nextErrors.relationship = "Indicá tu vínculo con el establecimiento.";
    if (relationship === "other" && !relationshipOther.trim()) nextErrors.relationshipOther = "Indicá cuál es el otro vínculo.";
    if (!respondentType) nextErrors.respondentType = "Indicá quién está respondiendo.";
    if (!residentParticipation) nextErrors.residentParticipation = "Indicá cómo participó la persona residente.";
    return nextErrors;
  }

  function validateReview() {
    const nextErrors: FormErrors = {};
    if (answeredCount === 0 && !narrative.trim()) nextErrors.content = "Respondé al menos una pregunta o escribí un relato antes de enviar.";
    if (!consent) nextErrors.consent = "Confirmá la revisión privada antes de enviar.";
    return nextErrors;
  }

  function goNext() {
    const stepErrors = step === 1 ? validatePrivacy() : step === 2 ? validateContext() : {};
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  function goToStep(targetStep: number) {
    if (submitting) return;
    setErrors({});
    setStep(Math.min(TOTAL_STEPS, Math.max(1, targetStep)));
  }

  function setAnswer(questionId: ExperienceQuestionId, answer: ExperienceAnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    if (errors.content) setErrors((current) => {
      const { content: _content, ...rest } = current;
      return rest;
    });
  }

  function clearAnswer(questionId: ExperienceQuestionId) {
    setAnswers((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  async function uploadFiles(uploadToken: string, createdCaseCode: string) {
    const failed: string[] = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("uploadToken", uploadToken);
        formData.set("purpose", "evidence");
        const response = await fetch(`/api/intake-reports/${encodeURIComponent(createdCaseCode)}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) failed.push(file.name);
      } catch {
        failed.push(file.name);
      }
    }
    return failed;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < TOTAL_STEPS) {
      goNext();
      return;
    }
    const allErrors = { ...validatePrivacy(), ...validateContext(), ...validateReview() };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(firstErrorStep(allErrors));
      return;
    }
    if (!enabled || !privacyMode || !relationship || !respondentType || !residentParticipation) return;

    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: 5,
          facilityId,
          privacyMode,
          contact: privacyMode === "anonymous" ? null : {
            fullName: contact.fullName.trim() || null,
            phone: contact.phone.trim() || null,
            email: contact.email.trim() || null,
          },
          relationship,
          relationshipOther: relationship === "other" ? relationshipOther.trim() : null,
          respondentType,
          residentParticipation,
          narrative: narrative.trim() || null,
          answers,
          requestedDestination: privacyMode === "anonymous" ? requestedDestination : "private_review",
          publicationConsent: privacyMode === "anonymous" && requestedDestination === "consider_anonymized" && publicationConsent,
          futureAuthorizations: privacyMode === "registered_identity"
            ? futureAuthorizations
            : { publicName: false, shareContactWithFacility: false },
          consent: true,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string; caseCode?: string; uploadToken?: string };
      if (!response.ok || !result.caseCode) throw new Error(result.error || "No se pudo guardar la experiencia.");

      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      const failed = files.length === 0
        ? []
        : result.uploadToken
          ? await uploadFiles(result.uploadToken, result.caseCode)
          : files.map((file) => file.name);
      setCaseCode(result.caseCode);
      setMessage(`${result.message || "La experiencia quedó en revisión humana."}${failed.length ? ` No se pudieron adjuntar: ${failed.join(", ")}.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la experiencia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseCode) return <section className={styles.success} aria-live="polite">
    <CheckCircle2 size={48} aria-hidden="true" />
    <h1>Experiencia recibida para revisión</h1>
    <p>{message}</p>
    <p className={styles.caseCode}><span>Código de seguimiento</span><strong>{caseCode}</strong></p>
    <Link href={`/seguimiento?codigo=${encodeURIComponent(caseCode)}`} className={styles.primaryButton}>Consultar seguimiento</Link>
  </section>;

  const stepDescription = step === 1
    ? "Elegí primero cómo querés que el equipo trate tus datos. No hay ninguna opción preseleccionada."
    : step === 2
      ? "Identificá el establecimiento y contanos desde qué vínculo se completa la experiencia."
      : currentDimension
        ? `Bloque ${currentDimension.order} de 6. ${directVersion ? "Las preguntas están redactadas para que respondas sobre tu propia experiencia." : "Las preguntas están redactadas para responder sobre la experiencia de la persona residente."}`
        : "Revisá la información, el resultado orientativo privado y las autorizaciones antes de enviar.";

  return <section className={styles.flow}>
    <header className={styles.hero}>
      <div className={styles.heroIcon}><ShieldCheck size={26} aria-hidden="true" /></div>
      <div>
        <span className={styles.eyebrow}>Bandeja privada · revisión humana</span>
        <h1>Compartí tu experiencia en un ELEPEM</h1>
        <p>{INTRO_TEXT}</p>
      </div>
    </header>

    {!enabled && <p className={styles.notice} role="status">La recepción de experiencias está temporalmente desactivada. Podés recorrer el formulario, pero no enviarlo.</p>}

    <div className={styles.progressPanel}>
      <div className={styles.progressSummary}>
        <strong>Paso {step} de {TOTAL_STEPS} <span className={styles.phaseBadge}>Fase {currentPhase} de 4</span></strong>
        <span>{Math.round((step / TOTAL_STEPS) * 100)} % del recorrido</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Progreso del formulario"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-valuetext={`Paso ${step} de ${TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
      >
        <span style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
      <ol className={styles.stepList} aria-label="Etapas del formulario">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          return <li className={number === step ? styles.currentStep : undefined} key={label}>
            <button
              type="button"
              className={styles.stepButton}
              aria-current={number === step ? "step" : undefined}
              aria-label={`Ir al paso ${number} de ${TOTAL_STEPS}: ${label}`}
              disabled={submitting}
              onClick={() => goToStep(number)}
            >
              <span>{number}</span>
              <small>{label}</small>
            </button>
          </li>;
        })}
      </ol>
    </div>

    <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
      <div className={styles.stage}>
        <header className={styles.stageHeader}>
          <span>Paso {step} de {TOTAL_STEPS}</span>
          <h2 id="experience-step-title" tabIndex={-1} ref={stepHeadingRef}>{STEP_LABELS[step - 1]}</h2>
          <p>{stepDescription}</p>
        </header>

        {Object.keys(errors).length > 0 && <div className={styles.errorSummary} role="alert" tabIndex={-1} ref={errorSummaryRef}>
          <strong>Revisá estos datos para continuar:</strong>
          <ul>{Object.values(errors).map((error) => <li key={error}>{error}</li>)}</ul>
        </div>}

        {step === 1 && <div className={styles.privacyStep}>
          <fieldset className={styles.choiceFieldset} aria-invalid={Boolean(errors.privacyMode)} aria-describedby={errors.privacyMode ? "privacy-error" : undefined}>
            <legend>¿Cómo querés compartir tu experiencia?</legend>
            <div className={styles.choiceGrid}>
              {PRIVACY_OPTIONS.map((option) => <label className={`${styles.choiceCard} ${privacyMode === option.value ? styles.selected : ""}`} key={option.value}>
                <input type="radio" name="privacyMode" value={option.value} checked={privacyMode === option.value} onChange={() => changePrivacy(option.value)} />
                <span><strong>{option.title}</strong><small>{option.description}</small></span>
              </label>)}
            </div>
            {errors.privacyMode && <small className={styles.fieldError} id="privacy-error">{errors.privacyMode}</small>}
          </fieldset>

          {privacyMode === "anonymous" && <section className={styles.subsection} aria-labelledby="anonymous-destination-title">
            <div className={styles.subsectionHeader}>
              <LockKeyhole size={21} aria-hidden="true" />
              <div><h3 id="anonymous-destination-title">Destino de la experiencia anónima</h3><p>Nada se publica automáticamente. La decisión final siempre requiere moderación humana.</p></div>
            </div>
            <div className={styles.compactChoices}>
              <label className={`${styles.compactChoice} ${requestedDestination === "private_review" ? styles.selected : ""}`}>
                <input type="radio" name="requestedDestination" value="private_review" checked={requestedDestination === "private_review"} onChange={() => { setRequestedDestination("private_review"); setPublicationConsent(false); }} />
                <span><strong>Sólo revisión estatal privada</strong><small>La experiencia queda únicamente en la bandeja privada.</small></span>
              </label>
              <label className={`${styles.compactChoice} ${requestedDestination === "consider_anonymized" ? styles.selected : ""}`}>
                <input type="radio" name="requestedDestination" value="consider_anonymized" checked={requestedDestination === "consider_anonymized"} onChange={() => setRequestedDestination("consider_anonymized")} />
                <span><strong>Considerar una versión anonimizada</strong><small>El equipo podrá preparar una versión moderada sin datos identificatorios.</small></span>
              </label>
            </div>
            {requestedDestination === "consider_anonymized" && <label className={styles.checkRow}>
              <input type="checkbox" checked={publicationConsent} aria-invalid={Boolean(errors.publicationConsent)} aria-describedby={errors.publicationConsent ? "publication-consent-error" : undefined} onChange={(event) => setPublicationConsent(event.target.checked)} />
              <span>Autorizo que, después de la revisión humana, pueda considerarse la publicación de una versión anonimizada y moderada.</span>
            </label>}
            {errors.publicationConsent && <small className={styles.fieldError} id="publication-consent-error">{errors.publicationConsent}</small>}
          </section>}

          {(privacyMode === "confidential" || privacyMode === "registered_identity") && <section className={styles.subsection} aria-labelledby="contact-title">
            <div className={styles.subsectionHeader}>
              <LockKeyhole size={21} aria-hidden="true" />
              <div><h3 id="contact-title">Datos de contacto opcionales</h3><p>Podés completar ninguno, uno o varios. No se guardan en el borrador del navegador.</p></div>
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>Nombre y apellido completo <small>Opcional</small></span><input autoComplete="name" maxLength={160} value={contact.fullName} onChange={(event) => setContact((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label className={styles.field}><span>Celular / Teléfono <small>Opcional</small></span><input type="tel" autoComplete="tel" maxLength={24} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "contact-phone-error" : undefined} value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} />{errors.phone && <small className={styles.fieldError} id="contact-phone-error">{errors.phone}</small>}</label>
              <label className={styles.field}><span>Correo electrónico <small>Opcional</small></span><input type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} />{errors.email && <small className={styles.fieldError} id="contact-email-error">{errors.email}</small>}</label>
            </div>
          </section>}

          {privacyMode === "registered_identity" && <section className={styles.authorizationBox} aria-labelledby="future-authorizations-title">
            <h3 id="future-authorizations-title">Autorizaciones para revisión futura</h3>
            <p>Estas opciones sólo registran tu voluntad para que el equipo la evalúe. No publican tu nombre ni envían tus datos al ELEPEM automáticamente.</p>
            <label className={styles.checkRow}><input type="checkbox" checked={futureAuthorizations.publicName} aria-invalid={Boolean(errors.publicName)} aria-describedby={errors.publicName ? "public-name-authorization-error" : undefined} onChange={(event) => setFutureAuthorizations((current) => ({ ...current, publicName: event.target.checked }))} /><span>Autorizo que pueda evaluarse la publicación de mi nombre.</span></label>
            {errors.publicName && <small className={styles.fieldError} id="public-name-authorization-error">{errors.publicName}</small>}
            <label className={styles.checkRow}><input type="checkbox" checked={futureAuthorizations.shareContactWithFacility} aria-invalid={Boolean(errors.shareContact)} aria-describedby={errors.shareContact ? "share-contact-authorization-error" : undefined} onChange={(event) => setFutureAuthorizations((current) => ({ ...current, shareContactWithFacility: event.target.checked }))} /><span>Autorizo que pueda evaluarse compartir mis datos con el ELEPEM.</span></label>
            {errors.shareContact && <small className={styles.fieldError} id="share-contact-authorization-error">{errors.shareContact}</small>}
          </section>}
        </div>}

        {step === 2 && <div className={styles.contextStep}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span>Departamento</span><select value={department} onChange={(event) => {
              const nextDepartment = event.target.value;
              setDepartment(nextDepartment);
              if (selectedFacility?.department !== nextDepartment) setFacilityId("");
            }}><option value="">Elegí un departamento</option>{URUGUAY_DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className={styles.field}><span>ELEPEM</span><select value={facilityId} disabled={!department} aria-invalid={Boolean(errors.facilityId)} aria-describedby={errors.facilityId ? "facility-error" : undefined} onChange={(event) => setFacilityId(event.target.value)}><option value="">{department ? "Elegí un ELEPEM" : "Primero elegí un departamento"}</option>{departmentFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.locality}</option>)}</select>{errors.facilityId && <small className={styles.fieldError} id="facility-error">{errors.facilityId}</small>}</label>
          </div>

          <label className={styles.field}><span>Tu vínculo con el establecimiento</span><select value={relationship} aria-invalid={Boolean(errors.relationship)} aria-describedby={errors.relationship ? "relationship-error" : undefined} onChange={(event) => changeRelationship(event.target.value as RelationshipValue | "")}><option value="">Elegí una opción</option>{RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{errors.relationship && <small className={styles.fieldError} id="relationship-error">{errors.relationship}</small>}</label>
          {relationship === "other" && <label className={styles.field}><span>Indicá el otro vínculo</span><input maxLength={160} value={relationshipOther} aria-invalid={Boolean(errors.relationshipOther)} aria-describedby={errors.relationshipOther ? "relationship-other-error" : undefined} onChange={(event) => setRelationshipOther(event.target.value)} />{errors.relationshipOther && <small className={styles.fieldError} id="relationship-other-error">{errors.relationshipOther}</small>}</label>}

          <fieldset className={styles.choiceFieldset} aria-invalid={Boolean(errors.respondentType)} aria-describedby={errors.respondentType ? "respondent-type-error" : undefined}>
            <legend>¿Quién está respondiendo?</legend>
            <p className={styles.fieldHelp}>Sugerimos una opción según el vínculo, pero podés cambiarla. Tu elección no será sobrescrita.</p>
            <div className={styles.inlineChoiceGrid}>{RESPONDENT_OPTIONS.map((option) => <label className={`${styles.inlineChoice} ${respondentType === option.value ? styles.selected : ""}`} key={option.value}><input type="radio" name="respondentType" value={option.value} checked={respondentType === option.value} onChange={() => { respondentEditedRef.current = true; setRespondentType(option.value); }} /><span>{option.label}</span></label>)}</div>
            {errors.respondentType && <small className={styles.fieldError} id="respondent-type-error">{errors.respondentType}</small>}
          </fieldset>

          <fieldset className={styles.choiceFieldset} aria-invalid={Boolean(errors.residentParticipation)} aria-describedby={errors.residentParticipation ? "resident-participation-error" : undefined}>
            <legend>¿La persona residente participó en esta evaluación?</legend>
            <div className={styles.inlineChoiceGrid}>{PARTICIPATION_OPTIONS.map((option) => <label className={`${styles.inlineChoice} ${residentParticipation === option.value ? styles.selected : ""}`} key={option.value}><input type="radio" name="residentParticipation" value={option.value} checked={residentParticipation === option.value} onChange={() => setResidentParticipation(option.value)} /><span>{option.label}</span></label>)}</div>
            {errors.residentParticipation && <small className={styles.fieldError} id="resident-participation-error">{errors.residentParticipation}</small>}
          </fieldset>

          <PrivateAttachmentFields files={files} recordedAudio={null} onFilesChange={setFiles} onRecordedAudioChange={() => undefined} onMessage={setMessage} allowRecording={false}>
            <label className={`${styles.field} ${styles.narrativeField}`}><span>Contá brevemente tu experiencia con este establecimiento. <small>Opcional · {narrative.length.toLocaleString("es-UY")} / 6.000</small></span><textarea maxLength={6000} rows={7} value={narrative} onChange={(event) => setNarrative(event.target.value)} aria-describedby="experience-narrative-help" /><small className={styles.fieldHelp} id="experience-narrative-help">No incluyas datos que permitan identificar a una persona residente. El relato y los archivos no se guardan en el borrador del navegador.</small></label>
          </PrivateAttachmentFields>
          {message && <p className={styles.inlineMessage} role="status">{message}</p>}
        </div>}

        {currentDimension && <QuestionBlock dimension={currentDimension} answers={answers} directVersion={directVersion} onAnswer={setAnswer} onClear={clearAnswer} />}

        {step === 9 && <div className={styles.reviewStep}>
          <section className={styles.reviewSection} aria-labelledby="review-summary-title">
            <h3 id="review-summary-title">Resumen del envío</h3>
            <dl className={styles.summaryGrid}>
              <div><dt>ELEPEM</dt><dd>{selectedFacility ? `${selectedFacility.name} · ${selectedFacility.locality} · ${selectedFacility.department}` : "Sin elegir"}</dd></div>
              <div><dt>Privacidad</dt><dd>{privacyLabel(privacyMode)}</dd></div>
              <div><dt>Contacto privado</dt><dd>{privacyMode === "anonymous" ? "No se enviarán datos de contacto" : [contact.fullName, contact.phone, contact.email].filter((value) => value.trim()).join(" · ") || "No aportado"}</dd></div>
              <div><dt>Destino</dt><dd>{privacyMode === "anonymous" && requestedDestination === "consider_anonymized" ? "Considerar versión anonimizada" : "Revisión estatal privada"}</dd></div>
              <div><dt>Autorizaciones futuras</dt><dd>{privacyMode === "registered_identity" ? [futureAuthorizations.publicName ? "Evaluar publicación del nombre" : "No publicar nombre", futureAuthorizations.shareContactWithFacility ? "Evaluar compartir contacto" : "No compartir contacto"].join(" · ") : "No corresponden"}</dd></div>
              <div><dt>Vínculo</dt><dd>{optionLabel(RELATIONSHIP_OPTIONS, relationship)}{relationship === "other" && relationshipOther ? `: ${relationshipOther}` : ""}</dd></div>
              <div><dt>Quién responde</dt><dd>{optionLabel(RESPONDENT_OPTIONS, respondentType)}</dd></div>
              <div><dt>Participación</dt><dd>{optionLabel(PARTICIPATION_OPTIONS, residentParticipation)}</dd></div>
              <div><dt>Cuestionario</dt><dd>{answeredCount} de 30 preguntas respondidas</dd></div>
              <div><dt>Relato y adjuntos</dt><dd>{narrative.trim() ? "Relato incluido" : "Sin relato"} · {files.length ? `${files.length} archivo(s)` : "Sin archivos"}</dd></div>
            </dl>
          </section>

          <section className={styles.scoreSection} aria-labelledby="score-preview-title">
            <div className={styles.subsectionHeader}><LockKeyhole size={21} aria-hidden="true" /><div><h3 id="score-preview-title">Vista previa privada y orientativa</h3><p>La metodología es una propuesta para el prototipo, no una clasificación oficial y no altera la ficha pública del ELEPEM. “No pude evaluarlo” y “No corresponde” no entran en el cálculo.</p></div></div>
            <div className={styles.scoreGrid}>{EXPERIENCE_DIMENSIONS.map((dimension) => {
              const result = scorePreview[dimension.id];
              return <article className={styles.scoreCard} key={dimension.id}><span>{dimension.title}</span>{result.average === null || result.category === null ? <strong>Sin información suficiente</strong> : <><strong>{result.average.toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 4</strong><small className={styles[`category_${result.category}`]}>{CATEGORY_LABELS[result.category]}</small></>}<em>{result.scoredCount} respuesta(s) con puntaje</em></article>;
            })}</div>
          </section>

          <section className={styles.sources} aria-labelledby="experience-sources-title">
            <h3 id="experience-sources-title">Fuentes y alcance</h3>
            <p>Las preguntas se trazan a la guía del Sistema de Cuidados, al documento de buenas prácticas del Movimiento ELEPEM y, cuando se indica, a una decisión metodológica de Arandú.</p>
            <div><a href="https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/elegir-centro-larga-estadia-tener-cuenta-folleto" target="_blank" rel="noreferrer">Sistema de Cuidados · Elegir un centro de larga estadía</a><a href="https://www.movimientoelepem.org.uy/documentos/otros-documentos/" target="_blank" rel="noreferrer">Movimiento ELEPEM · Documentos de buenas prácticas</a></div>
          </section>

          <label className={`${styles.checkRow} ${styles.finalConsent}`}><input type="checkbox" checked={consent} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "final-consent-error" : undefined} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que la información es correcta y acepto su revisión privada. Entiendo que nada se publica ni se comparte automáticamente.</span></label>
          {errors.consent && <small className={styles.fieldError} id="final-consent-error">{errors.consent}</small>}
          {errors.content && <small className={styles.fieldError}>{errors.content}</small>}
          {message && <p className={styles.submitError} role="alert">{message}</p>}
        </div>}
      </div>

      <footer className={styles.actions}>
        <button type="button" className={styles.secondaryButton} disabled={step === 1 || submitting} onClick={goBack}><ArrowLeft size={17} aria-hidden="true" />Volver</button>
        <div className={styles.draftArea}><div><button type="button" className={styles.saveButton} disabled={submitting} onClick={saveDraftNow}><Save size={16} aria-hidden="true" />Guardar avance</button><button type="button" className={styles.clearDraftButton} disabled={submitting} onClick={clearDraft}>Borrar borrador</button></div><small aria-live="polite">{draftStatus}</small></div>
        {step < TOTAL_STEPS
          ? <button type="button" className={styles.primaryButton} disabled={submitting} onClick={goNext}>Continuar<ArrowRight size={17} aria-hidden="true" /></button>
          : <button type="submit" className={styles.primaryButton} disabled={!enabled || submitting}>{submitting ? "Enviando…" : "Enviar para revisión"}<ArrowRight size={17} aria-hidden="true" /></button>}
      </footer>
    </form>
  </section>;
}
