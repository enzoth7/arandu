"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { URUGUAY_DEPARTMENTS } from "../../lib/uruguay.mjs";

export type ExperienceFacilityOption = {
  id: string;
  name: string;
  locality: string;
  department: string;
};

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

const DESTINATIONS = [
  {
    value: "aggregate",
    title: "Resumen agregado",
    description: "Se combina con otras experiencias, sin identificarte.",
  },
  {
    value: "private_facility",
    title: "Envío privado al ELEPEM",
    description: "Puede compartirse con el ELEPEM después de la moderación.",
  },
  {
    value: "consider_anonymized",
    title: "Publicación anonimizada en la ficha",
    description: "El Estado podrá publicar una versión moderada sin datos identificatorios.",
  },
] as const;

export function ExperienceForm({ facilities, initialFacilityId = "", enabled }: { facilities: ExperienceFacilityOption[]; initialFacilityId?: string; enabled: boolean }) {
  const initialFacility = facilities.find((facility) => facility.id === initialFacilityId);
  const validInitial = initialFacility?.id || "";
  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState(initialFacility?.department || "");
  const [facilityId, setFacilityId] = useState(validInitial);
  const [relationship, setRelationship] = useState("");
  const [period, setPeriod] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [narrative, setNarrative] = useState("");
  const [destination, setDestination] = useState("");
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const departmentFacilities = useMemo(() => facilities.filter((facility) => facility.department === department), [department, facilities]);
  const selectedFacility = useMemo(() => facilities.find((facility) => facility.id === facilityId), [facilities, facilityId]);
  const canAdvance = step === 1
    ? Boolean(facilityId && relationship && period)
    : step === 2
      ? QUESTIONS.every(([key]) => Boolean(answers[key]))
      : step === 3
        ? Boolean(destination && (destination !== "consider_anonymized" || publicationConsent))
        : consent;

  async function submit() {
    if (!canAdvance || !enabled) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          relationship,
          period,
          answers,
          narrative,
          requestedDestination: destination,
          publicationConsent: destination === "consider_anonymized" && publicationConsent,
          contact,
          consent,
        }),
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
      <h1>Compartir una experiencia</h1>
      <p className="lead">La experiencia quedará en una bandeja privada para moderación. Nunca se publica de forma automática.</p>
      {!enabled && <p className="notice" role="status">La recepción de experiencias está temporalmente desactivada.</p>}
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
        <label className="reportField"><span>Departamento <em className="requiredMark">(obligatorio)</em></span><select value={department} onChange={(event) => {
          const nextDepartment = event.target.value;
          setDepartment(nextDepartment);
          if (selectedFacility?.department !== nextDepartment) setFacilityId("");
        }}><option value="">Elegí un departamento</option>{URUGUAY_DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className="reportField"><span>ELEPEM <em className="requiredMark">(obligatorio)</em></span><select value={facilityId} disabled={!department} onChange={(event) => setFacilityId(event.target.value)}><option value="">{department ? "Elegí un ELEPEM" : "Primero elegí un departamento"}</option>{departmentFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.locality}</option>)}</select></label>
        <label className="reportField"><span>Tu vínculo <em className="requiredMark">(obligatorio)</em></span><select value={relationship} onChange={(event) => setRelationship(event.target.value)}><option value="">Elegí una opción</option><option>Persona residente</option><option>Familiar o referente</option><option>Trabajador/a</option><option>Visitante</option><option>Otro vínculo</option></select></label>
        <label className="reportField"><span>Período aproximado <em className="requiredMark">(obligatorio)</em></span><input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ej.: entre marzo y julio de 2026" maxLength={120} /></label>
      </div>}

      {step === 2 && <div className="experienceQuestionList">
        {QUESTIONS.map(([key, label]) => <fieldset key={key}><legend>{label}</legend><div className="experienceAnswerGrid">{ANSWERS.map(([value, answerLabel]) => <label key={value} className={`answer-${value}${answers[key] === value ? " isSelected" : ""}`}><input type="radio" name={key} value={value} checked={answers[key] === value} onChange={() => setAnswers((current) => ({ ...current, [key]: value }))} />{answerLabel}</label>)}</div></fieldset>)}
      </div>}

      {step === 3 && <div className="experienceStepThree">
        <label className="reportField experienceNarrative">
          <span>Relato opcional <small>{narrative.length.toLocaleString("es-UY")} / 6.000</small></span>
          <textarea aria-describedby="experienceNarrativeHelp" value={narrative} onChange={(event) => setNarrative(event.target.value)} maxLength={6000} placeholder="Contá sólo lo que quieras aportar." />
          <small className="experienceFieldHelp" id="experienceNarrativeHelp">Evitá datos clínicos o identificatorios de residentes.</small>
        </label>

        <label className="reportField experienceDestinationSelect">
          <span>Destino solicitado</span>
          <select value={destination} onChange={(event) => setDestination(event.target.value)}>
            <option value="">Elegí una opción</option>
            {DESTINATIONS.map(({ value, title }) => <option key={value} value={value}>{title}</option>)}
          </select>
          <small className="experienceFieldHelp">{DESTINATIONS.find((option) => option.value === destination)?.description || "Elegí cómo querés que se use tu experiencia después de la moderación."}</small>
        </label>

        {destination === "consider_anonymized" && <label className="reportCheckbox experiencePublicationConsent">
          <input type="checkbox" checked={publicationConsent} onChange={(event) => setPublicationConsent(event.target.checked)} />
          <span>Autorizo que una versión anonimizada y moderada pueda publicarse en la ficha del ELEPEM.</span>
        </label>}

        <header className="experienceContactHeader"><h2>Contacto opcional</h2><p>Completalo sólo si querés que podamos comunicarnos contigo.</p></header>
        <div className="reportFieldGrid reportFieldGridThree experienceContactFields">
          <label className="reportField"><span>Nombre</span><input autoComplete="name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
          <label className="reportField"><span>Teléfono</span><input autoComplete="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} inputMode="tel" /></label>
          <label className="reportField"><span>Correo</span><input autoComplete="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} type="email" /></label>
        </div>
      </div>}

      {step === 4 && <div className="experienceReview">
        <h2>Revisá antes de enviar</h2>
        <dl><div><dt>ELEPEM</dt><dd>{selectedFacility?.name} · {selectedFacility?.locality} · {selectedFacility?.department}</dd></div><div><dt>Vínculo y período</dt><dd>{relationship} · {period}</dd></div><div><dt>Destino solicitado</dt><dd>{DESTINATIONS.find((option) => option.value === destination)?.title}</dd></div><div><dt>Relato</dt><dd>{narrative || "Sin relato adicional"}</dd></div></dl>
        <label className="reportCheckbox"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que la información es correcta y acepto su revisión privada. Entiendo que sólo se publicará una versión anonimizada si la autoricé y el Estado la aprueba.</span></label>
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
