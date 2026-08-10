"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { DEMO_FACILITIES } from "../../lib/demo-facilities";

const QUESTIONS = [
  ["daily_life", "¿Las rutinas cotidianas respetaron las preferencias de la persona?"],
  ["communication", "¿La información del equipo fue clara y suficiente?"],
  ["participation", "¿La persona pudo participar en decisiones sobre su vida cotidiana?"],
  ["environment", "¿Los espacios resultaron accesibles, limpios y seguros?"],
  ["contact", "¿Fue posible mantener el vínculo con familiares o referentes?"],
] as const;

const ANSWERS = [
  ["yes", "Sí"],
  ["partial", "En parte"],
  ["no", "No"],
  ["unknown", "No puedo evaluarlo"],
  ["prefer_not_to_answer", "Prefiero no responder"],
] as const;

export function ExperienceForm({ initialFacilityId = "", enabled }: { initialFacilityId?: string; enabled: boolean }) {
  const validInitial = DEMO_FACILITIES.some((facility) => facility.id === initialFacilityId) ? initialFacilityId : "";
  const [step, setStep] = useState(1);
  const [facilityId, setFacilityId] = useState(validInitial);
  const [relationship, setRelationship] = useState("");
  const [period, setPeriod] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [narrative, setNarrative] = useState("");
  const [destination, setDestination] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedFacility = useMemo(() => DEMO_FACILITIES.find((facility) => facility.id === facilityId), [facilityId]);
  const canAdvance = step === 1
    ? Boolean(facilityId && relationship && period)
    : step === 2
      ? QUESTIONS.every(([key]) => Boolean(answers[key]))
      : step === 3
        ? Boolean(destination)
        : consent;

  async function submit() {
    if (!canAdvance || !enabled) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, relationship, period, answers, narrative, requestedDestination: destination, contact, consent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "No se pudo guardar.");
      setCaseCode(result.caseCode);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la experiencia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseCode) return <section className="reportFlow experienceSuccess" aria-live="polite">
    <CheckCircle2 size={42} />
    <h1>Experiencia recibida para revisión</h1>
    <p>{message}</p>
    <p className="reportCaseCode"><strong>{caseCode}</strong></p>
    <Link href={`/seguimiento?codigo=${encodeURIComponent(caseCode)}`} className="reportContinue">Consultar seguimiento</Link>
  </section>;

  return <section className="reportFlow experienceFlow">
    <header className="reportFlowHeader">
      <span className="demoPermanentBadge">Datos ficticios</span>
      <h1>Compartir una experiencia</h1>
      <p className="lead">La experiencia quedará en una bandeja privada para moderación. Nunca se publica de forma automática.</p>
      {!enabled && <p className="notice" role="status">La recepción demo está desactivada. Activá DEMO_MODE y DEMO_INTAKE_ENABLED sólo en el entorno de demostración.</p>}
    </header>

    <nav className="reportStepper reportStepperFour" aria-label="Pasos de la experiencia">
      {["ELEPEM y vínculo", "Preguntas", "Relato y destino", "Revisión"].map((label, index) => <button
        key={label}
        type="button"
        className={`reportStep ${step === index + 1 ? "isCurrent" : ""} ${step > index + 1 ? "isComplete" : ""}`}
        disabled={index + 1 > step || submitting}
        aria-current={step === index + 1 ? "step" : undefined}
        onClick={() => index + 1 < step && setStep(index + 1)}
      ><span className="reportStepNumber">{step > index + 1 ? <CheckCircle2 size={15} /> : index + 1}</span><span className="reportStepLabel">{label}</span></button>)}
    </nav>

    <div className="reportStage">
      {step === 1 && <div className="experienceFields">
        <label className="reportField"><span>ELEPEM ficticio <em className="requiredMark">(obligatorio)</em></span><select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}><option value="">Elegí un perfil demo</option>{DEMO_FACILITIES.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.id}</option>)}</select></label>
        {selectedFacility && <p className="privacyNotice privacyNotice-gray"><strong>Datos ficticios:</strong> {selectedFacility.name}, {selectedFacility.locality}. No corresponde a un establecimiento real.</p>}
        <label className="reportField"><span>Tu vínculo <em className="requiredMark">(obligatorio)</em></span><select value={relationship} onChange={(event) => setRelationship(event.target.value)}><option value="">Elegí una opción</option><option>Persona residente</option><option>Familiar o referente</option><option>Trabajador/a</option><option>Visitante</option><option>Otro vínculo</option></select></label>
        <label className="reportField"><span>Período aproximado <em className="requiredMark">(obligatorio)</em></span><input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ej.: entre marzo y julio de 2026" maxLength={120} /></label>
      </div>}

      {step === 2 && <div className="experienceQuestionList">
        {QUESTIONS.map(([key, label]) => <fieldset key={key}><legend>{label}</legend><div className="experienceAnswerGrid">{ANSWERS.map(([value, answerLabel]) => <label key={value} className={answers[key] === value ? "isSelected" : ""}><input type="radio" name={key} value={value} checked={answers[key] === value} onChange={() => setAnswers((current) => ({ ...current, [key]: value }))} />{answerLabel}</label>)}</div></fieldset>)}
      </div>}

      {step === 3 && <div className="experienceFields">
        <label className="reportField"><span>Relato opcional</span><textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} maxLength={6000} placeholder="Contá sólo lo que quieras aportar. Evitá datos clínicos o identificatorios de residentes." /></label>
        <fieldset className="experienceDestination"><legend>Destino solicitado <em className="requiredMark">(obligatorio)</em></legend>{[
          ["aggregate", "Usar sólo en un resumen agregado"],
          ["private_facility", "Enviar en privado al ELEPEM, luego de moderación"],
          ["consider_anonymized", "Considerar una versión anonimizada"],
        ].map(([value, label]) => <label key={value}><input type="radio" name="destination" checked={destination === value} onChange={() => setDestination(value)} />{label}</label>)}</fieldset>
        <div className="reportFieldGrid"><label className="reportField"><span>Nombre de contacto (opcional)</span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label><label className="reportField"><span>Teléfono (opcional)</span><input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} inputMode="tel" /></label></div>
        <label className="reportField"><span>Correo (opcional)</span><input value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} type="email" /></label>
      </div>}

      {step === 4 && <div className="experienceReview">
        <h2>Revisá antes de enviar</h2>
        <dl><div><dt>ELEPEM</dt><dd>{selectedFacility?.name} · Datos ficticios</dd></div><div><dt>Vínculo y período</dt><dd>{relationship} · {period}</dd></div><div><dt>Destino solicitado</dt><dd>{destination}</dd></div><div><dt>Relato</dt><dd>{narrative || "Sin relato adicional"}</dd></div></dl>
        <label className="reportCheckbox"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que la información es ficticia para esta demostración y acepto su revisión privada. Entiendo que no se publicará automáticamente.</span></label>
      </div>}
      {message && <p className="reportFieldError" role="alert">{message}</p>}
    </div>

    <footer className="reportActions">
      <button type="button" className="reportBack" disabled={step === 1 || submitting} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />Volver</button>
      <span>Paso {step} de 4</span>
      {step < 4
        ? <button type="button" className="reportContinue" disabled={!canAdvance} onClick={() => setStep((current) => current + 1)}>Continuar<ArrowRight size={17} /></button>
        : <button type="button" className="reportContinue" disabled={!canAdvance || !enabled || submitting} onClick={() => void submit()}>{submitting ? "Guardando…" : "Enviar para revisión"}<ArrowRight size={17} /></button>}
    </footer>
  </section>;
}
