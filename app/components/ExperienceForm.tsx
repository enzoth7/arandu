"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { URUGUAY_DEPARTMENTS } from "../../lib/uruguay.mjs";
import { PrivateAttachmentFields } from "./PrivateAttachmentFields";
import { PrivacyContactBlock, type PrivacyChoice } from "./PrivacyContactBlock";

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
  { value: "private_review", title: "Sólo revisión estatal privada", description: "Queda únicamente en la bandeja estatal para revisión." },
  { value: "private_facility", title: "Envío privado al ELEPEM", description: "Puede compartirse con el ELEPEM después de la moderación." },
  { value: "consider_anonymized", title: "Publicación anonimizada en la ficha", description: "El Estado podrá publicar una versión moderada sin datos identificatorios." },
] as const;

const YEARS = Array.from({ length: new Date().getFullYear() - 1919 }, (_, index) => String(new Date().getFullYear() - index));
function periodText(startYear: string, endYear: string, unknown: boolean) {
  if (unknown) return "No recuerda el período";
  if (startYear && endYear) return `De ${startYear} a ${endYear}`;
  if (startYear) return `Desde ${startYear}`;
  if (endYear) return `Hasta ${endYear}`;
  return "No informado";
}

export function ExperienceForm({ facilities, initialFacilityId = "", enabled }: { facilities: ExperienceFacilityOption[]; initialFacilityId?: string; enabled: boolean }) {
  const initialFacility = facilities.find((facility) => facility.id === initialFacilityId);
  const validInitial = initialFacility?.id || "";
  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState(initialFacility?.department || "");
  const [facilityId, setFacilityId] = useState(validInitial);
  const [relationship, setRelationship] = useState("");
  const [periodStartYear, setPeriodStartYear] = useState("");
  const [periodEndYear, setPeriodEndYear] = useState("");
  const [periodUnknown, setPeriodUnknown] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [narrative, setNarrative] = useState("");
  const [destination, setDestination] = useState("private_review");
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacyChoice>("Anónima");
  const [contact, setContact] = useState({ phone: "", email: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const departmentFacilities = useMemo(() => facilities.filter((facility) => facility.department === department), [department, facilities]);
  const selectedFacility = useMemo(() => facilities.find((facility) => facility.id === facilityId), [facilities, facilityId]);
  const period = periodText(periodStartYear, periodEndYear, periodUnknown);
  const publicationChoiceConfirmed = destination !== "consider_anonymized" || publicationConsent;
  const canSubmit = Boolean(facilityId && consent && publicationChoiceConfirmed);

  async function uploadFiles(uploadToken: string, createdCaseCode: string) {
    const failed: string[] = [];
    for (const file of [...files, ...(recordedAudio ? [recordedAudio] : [])]) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("uploadToken", uploadToken);
      formData.set("purpose", "evidence");
      const response = await fetch(`/api/intake-reports/${encodeURIComponent(createdCaseCode)}/attachments`, { method: "POST", body: formData });
      if (!response.ok) failed.push(file.name);
    }
    return failed;
  }

  async function submit() {
    if (!canSubmit || !enabled) return;
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
          periodStartYear,
          periodEndYear,
          periodUnknown,
          answers,
          narrative,
          requestedDestination: destination || "private_review",
          publicationConsent: destination === "consider_anonymized" && publicationConsent,
          privacy,
          contact: privacy === "Anónima" ? { phone: "", email: "" } : contact,
          consent,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "No se pudo guardar.");
      const failed = (files.length > 0 || recordedAudio) && typeof result.uploadToken === "string"
        ? await uploadFiles(result.uploadToken, result.caseCode)
        : [];
      setCaseCode(result.caseCode);
      setMessage(`${result.message}${failed.length ? ` No se pudieron adjuntar: ${failed.join(", ")}.` : ""}`);
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
      <p className="lead">La experiencia queda en una bandeja privada para moderación. Nunca se publica de forma automática.</p>
      {!enabled && <p className="notice" role="status">La recepción de experiencias está temporalmente desactivada.</p>}
    </header>

    <nav className="reportStepper reportStepperFour" aria-label="Pasos de la experiencia">
      {["Relato y ELEPEM", "Preguntas", "Destino y privacidad", "Revisión"].map((label, index) => <button
        key={label}
        type="button"
        className={`reportStep ${step === index + 1 ? "isCurrent" : ""} ${step > index + 1 ? "isComplete" : ""}`}
        disabled={submitting}
        aria-current={step === index + 1 ? "step" : undefined}
        onClick={() => setStep(index + 1)}
      ><span className="reportStepNumber">{step > index + 1 ? <CheckCircle2 size={15} /> : index + 1}</span><span className="reportStepLabel">{label}</span></button>)}
    </nav>

    <div className="reportStage">
      {step === 1 && <div className="experienceFields">
        <label className="reportField"><span>Departamento</span><select value={department} onChange={(event) => {
          const nextDepartment = event.target.value;
          setDepartment(nextDepartment);
          if (selectedFacility?.department !== nextDepartment) setFacilityId("");
        }}><option value="">Elegí un departamento</option>{URUGUAY_DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className="reportField"><span>ELEPEM</span><select value={facilityId} disabled={!department} onChange={(event) => setFacilityId(event.target.value)}><option value="">{department ? "Elegí un ELEPEM" : "Primero elegí un departamento"}</option>{departmentFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.locality}</option>)}</select><small className="experienceFieldHelp">Se necesita para enviar la experiencia al equipo correcto.</small></label>
        <label className="reportField"><span>Tu vínculo</span><select value={relationship} onChange={(event) => setRelationship(event.target.value)}><option value="">Prefiero no indicarlo</option><option>Persona residente</option><option>Familiar o referente</option><option>Trabajador/a</option><option>Visitante</option><option>Otro vínculo</option></select></label>
        <fieldset className="reportField experiencePeriod"><legend>Período aproximado</legend><div className="experiencePeriodRow"><label><span>De</span><select aria-label="Año de inicio" value={periodStartYear} disabled={periodUnknown} onChange={(event) => { const year = event.target.value; setPeriodStartYear(year); if (periodEndYear && year && Number(periodEndYear) < Number(year)) setPeriodEndYear(""); }}><option value="">Año</option>{YEARS.map((year) => <option key={year}>{year}</option>)}</select></label><label><span>a</span><select aria-label="Año de finalización" value={periodEndYear} disabled={periodUnknown} onChange={(event) => setPeriodEndYear(event.target.value)}><option value="">Año</option>{YEARS.filter((year) => !periodStartYear || Number(year) >= Number(periodStartYear)).map((year) => <option key={year}>{year}</option>)}</select></label><label className="reportCheckbox"><input type="checkbox" checked={periodUnknown} onChange={(event) => { const unknown = event.target.checked; setPeriodUnknown(unknown); if (unknown) { setPeriodStartYear(""); setPeriodEndYear(""); } }} /><span>No recuerdo el período</span></label></div></fieldset>
        <PrivateAttachmentFields files={files} recordedAudio={recordedAudio} onFilesChange={setFiles} onRecordedAudioChange={setRecordedAudio} onMessage={setMessage}><label className="reportField experienceNarrative"><span>Contá brevemente qué pasó <small>{narrative.length.toLocaleString("es-UY")} / 6.000</small></span><textarea aria-describedby="experienceNarrativeHelp" value={narrative} onChange={(event) => setNarrative(event.target.value)} maxLength={6000} placeholder="Podés dejar este campo en blanco." /><small className="experienceFieldHelp" id="experienceNarrativeHelp">Evitá datos clínicos o identificatorios de residentes.</small></label></PrivateAttachmentFields>
      </div>}

      {step === 2 && <div className="experienceQuestionList">
        <p className="experienceFieldHelp">Podés dejar preguntas sin responder.</p>
        {QUESTIONS.map(([key, label]) => <fieldset key={key}><legend>{label}</legend><div className="experienceAnswerGrid">{ANSWERS.map(([value, answerLabel]) => <label key={value} className={`answer-${value}${answers[key] === value ? " isSelected" : ""}`}><input type="radio" name={key} value={value} checked={answers[key] === value} onChange={() => setAnswers((current) => ({ ...current, [key]: value }))} />{answerLabel}</label>)}</div></fieldset>)}
      </div>}

      {step === 3 && <div className="experienceStepThree">
        <section className="experienceChoiceSection" aria-labelledby="experience-destination-title"><header><h2 id="experience-destination-title">Destino de la experiencia</h2><p>Elegí qué puede hacer el equipo después de revisarla. Nada se publica automáticamente.</p></header><div className="reportOptionGrid isCompact" role="group" aria-label="Destino solicitado">{DESTINATIONS.map(({ value, title, description }) => <button type="button" key={value} className={`reportOption ${destination === value ? "isSelected" : ""}`} aria-pressed={destination === value} onClick={() => { setDestination(value); if (value !== "consider_anonymized") setPublicationConsent(false); }}><span className="reportOptionCopy"><strong>{title}</strong><small>{description}</small></span></button>)}</div></section>
        {destination === "consider_anonymized" && <><label className="reportCheckbox experiencePublicationConsent"><input type="checkbox" checked={publicationConsent} onChange={(event) => setPublicationConsent(event.target.checked)} /><span>Autorizo que una versión anonimizada y moderada pueda publicarse en la ficha del ELEPEM.</span></label>{!publicationConsent && <p className="reportFieldError">Para solicitar una publicación anonimizada, confirmá esta autorización. Si no, elegí “Sólo revisión estatal privada”.</p>}</>}
        <section className="experienceChoiceSection" aria-labelledby="experience-privacy-title"><header><h2 id="experience-privacy-title">Privacidad y contacto</h2><p>El contacto es opcional y sólo se solicita si la experiencia no es anónima.</p></header><PrivacyContactBlock privacy={privacy} contact={contact} onPrivacyChange={setPrivacy} onContactChange={setContact} /></section>
      </div>}

      {step === 4 && <div className="experienceReview"><h2>Revisá antes de enviar</h2><div className="reportSummary"><div><strong>ELEPEM</strong><span>{selectedFacility ? `${selectedFacility.name} · ${selectedFacility.locality} · ${selectedFacility.department}` : "Pendiente de seleccionar"}</span></div><div><strong>Vínculo y período</strong><span>{relationship || "No informado"} · {period}</span></div><div><strong>Destino</strong><span>{DESTINATIONS.find((option) => option.value === destination)?.title}</span></div><div><strong>Privacidad</strong><span>{privacy}</span></div><div><strong>Contacto</strong><span>{privacy === "Anónima" ? "No se guardará contacto" : [contact.phone, contact.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</span></div><div><strong>Archivos</strong><span>{files.length + (recordedAudio ? 1 : 0) ? `${files.length + (recordedAudio ? 1 : 0)} archivo(s)` : "Sin archivos adjuntos"}</span></div><div><strong>Relato</strong><span>{narrative || "Sin relato adicional"}</span></div></div><label className="reportCheckbox"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que la información es correcta y acepto su revisión privada. Entiendo que sólo se publicará una versión anonimizada si la autorizo y el Estado la aprueba.</span></label>{!canSubmit && <p className="reportFieldError">Para enviar, elegí un ELEPEM, aceptá la revisión privada y, si corresponde, la publicación anonimizada.</p>}</div>}
      {message && !caseCode && <p className="reportFieldError" role="alert">{message}</p>}
    </div>

    <footer className="reportActions"><button type="button" className="reportBack" disabled={step === 1 || submitting} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />Volver</button><span>Paso {step} de 4</span>{step < 4 ? <button type="button" className="reportContinue" disabled={submitting} onClick={() => setStep((current) => current + 1)}>Continuar<ArrowRight size={17} /></button> : <button type="button" className="reportContinue" disabled={!canSubmit || !enabled || submitting} onClick={() => void submit()}>{submitting ? "Guardando…" : "Enviar para revisión"}<ArrowRight size={17} /></button>}</footer>
  </section>;
}
