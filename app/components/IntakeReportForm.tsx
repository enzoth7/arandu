"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { URUGUAY_DEPARTMENTS } from "../../lib/uruguay.mjs";
import { PrivateAttachmentFields } from "./PrivateAttachmentFields";
import { PrivacyContactBlock, type PrivacyChoice } from "./PrivacyContactBlock";

export type ConcernFacilityOption = { id: string; name: string; locality: string; department: string };

const CONCERNS = [
  "Violencia, amenazas o humillación",
  "Negligencia, abandono o falta de cuidados",
  "Dinero, préstamos, documentos o bienes",
  "Control, aislamiento, encierro o represalias",
  "Medicación, salud, caída o accidente",
  "Necesidad de cuidados o apoyos",
  "Riesgo o irregularidad en un residencial",
  "No sé cómo clasificarlo",
];

export function IntakeReportForm({
  facilities,
  initialConcerns = [],
  initialNarrative = "",
  initialFacilityId = "",
  enabled = false,
}: {
  facilities: ConcernFacilityOption[];
  initialConcerns?: string[];
  initialNarrative?: string;
  initialFacilityId?: string;
  enabled?: boolean;
}) {
  const initialFacility = facilities.find((facility) => facility.id === initialFacilityId);
  const [step, setStep] = useState(1);
  const [concerns, setConcerns] = useState<string[]>(initialConcerns.filter((item) => CONCERNS.includes(item)));
  const [narrative, setNarrative] = useState(initialNarrative);
  const [urgency, setUrgency] = useState<"Alta" | "Media" | "Baja">("Baja");
  const [department, setDepartment] = useState(initialFacility?.department || "");
  const [facilityId, setFacilityId] = useState(initialFacility?.id || "");
  const [privacy, setPrivacy] = useState<PrivacyChoice>("Anónima");
  const [contact, setContact] = useState({ phone: "", email: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const departmentFacilities = useMemo(() => facilities.filter((facility) => facility.department === department), [department, facilities]);
  const selectedFacility = facilities.find((facility) => facility.id === facilityId);
  const canSubmit = Boolean(facilityId && consent);

  function toggleConcern(concern: string) {
    setConcerns((current) => current.includes(concern) ? current.filter((item) => item !== concern) : [...current, concern]);
  }

  async function uploadFiles(uploadToken: string, savedCaseCode: string) {
    const failed: string[] = [];
    for (const file of [...files, ...(recordedAudio ? [recordedAudio] : [])]) {
      const body = new FormData();
      body.set("file", file);
      body.set("uploadToken", uploadToken);
      const response = await fetch(`/api/intake-reports/${encodeURIComponent(savedCaseCode)}/attachments`, { method: "POST", body });
      if (!response.ok) failed.push(file.name);
    }
    return failed;
  }

  async function submit() {
    if (!canSubmit || !enabled || !selectedFacility) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: {
          setting: "En un residencial / ELEPEM",
          reporter: "No indicado",
          channel: "Formulario web / app",
          location: { department: selectedFacility.department, reference: `${selectedFacility.name} · ${selectedFacility.locality}` },
          facility: { id: selectedFacility.id, name: selectedFacility.name, locality: selectedFacility.locality, department: selectedFacility.department },
          concerns,
          narrative,
          risks: ["Por evaluar por el equipo"],
          privacy,
          contactEmail: privacy === "Anónima" ? "" : contact.email,
          contactPhone: privacy === "Anónima" ? "" : contact.phone,
          preliminaryPriority: urgency,
          suggestedRoute: [],
          consent,
        } }),
      });
      const data = await response.json();
      if (!response.ok || typeof data?.caseCode !== "string") throw new Error(data?.error || "No se pudo guardar la comunicación.");
      const failed = (files.length > 0 || recordedAudio) && typeof data.uploadToken === "string" ? await uploadFiles(data.uploadToken, data.caseCode) : [];
      setCaseCode(data.caseCode);
      setMessage(failed.length ? `La comunicación se guardó, pero no se pudieron adjuntar: ${failed.join(", ")}.` : "La comunicación quedó en revisión humana privada.");
      try { window.sessionStorage.setItem("arandu-last-code", data.caseCode); } catch {}
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la comunicación.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseCode) return <section className="reportFlow reportSuccess" aria-live="polite">
    <div className="reportSuccessMark"><CheckCircle2 size={36} /></div><h1>Recibimos tu comunicación</h1><p>{message}</p>
    <div className="reportTrackingCodeClean"><code>{caseCode}</code><button type="button" className="reportCopyButtonClean" onClick={() => void navigator.clipboard.writeText(caseCode).then(() => setCopyState("copied")).catch(() => setCopyState("error"))}>{copyState === "copied" ? <CheckCircle2 size={16} /> : <Copy size={16} />}{copyState === "copied" ? "Copiado" : "Copiar código"}</button></div>
    {copyState === "error" && <p className="reportFieldError">No se pudo copiar automáticamente. Guardá el código manualmente.</p>}
    <div className="reportSuccessSingleAction"><Link className="reportBack" href={`/seguimiento?codigo=${encodeURIComponent(caseCode)}`}>Consultar el estado</Link><Link className="reportContinue" href="/">Volver al inicio <ArrowRight size={17} /></Link></div>
  </section>;

  const stageTitle = step === 1 ? "¿Qué está pasando?" : step === 2 ? "¿En qué ELEPEM ocurre?" : step === 3 ? "Privacidad y contacto" : "Revisá y enviá";
  return <section className="reportFlow concernFlow">
    <header className="reportFlowHeader"><h1>{stageTitle}</h1><p className="lead">La comunicación se envía a una bandeja privada. No se publica ni se comunica automáticamente al ELEPEM.</p>{!enabled && <p className="notice" role="status">La recepción está temporalmente desactivada.</p>}</header>
    <nav className="reportStepper reportStepperFour" aria-label="Pasos de la comunicación">{["Situación", "ELEPEM", "Privacidad y contacto", "Revisión"].map((label, index) => <button type="button" key={label} className={`reportStep ${step === index + 1 ? "isCurrent" : ""} ${step > index + 1 ? "isComplete" : ""}`} disabled={submitting} aria-current={step === index + 1 ? "step" : undefined} onClick={() => setStep(index + 1)}><span className="reportStepNumber">{step > index + 1 ? <CheckCircle2 size={15} /> : index + 1}</span><span className="reportStepLabel">{label}</span></button>)}</nav>
    <div className="reportStage">
      {step === 1 && <><div className="reportOptionGrid isCompact">{CONCERNS.map((concern) => <button key={concern} type="button" className={`reportOption ${concerns.includes(concern) ? "isSelected" : ""}`} aria-pressed={concerns.includes(concern)} onClick={() => toggleConcern(concern)}><span className="reportOptionCopy"><strong>{concern}</strong></span><span className="reportOptionCheck">{concerns.includes(concern) ? <CheckCircle2 size={16} /> : "+"}</span></button>)}</div><PrivateAttachmentFields files={files} recordedAudio={recordedAudio} onFilesChange={setFiles} onRecordedAudioChange={setRecordedAudio} onMessage={setMessage}><label className="reportField experienceNarrative"><span>Contá brevemente qué está pasando <small>{narrative.length.toLocaleString("es-UY")} / 6.000</small></span><textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} maxLength={6000} placeholder="Podés dejar este campo en blanco." /></label></PrivateAttachmentFields><label className="reportField concernUrgencyField"><span>Urgencia aproximada</span><select value={urgency} onChange={(event) => setUrgency(event.target.value as typeof urgency)}><option value="Alta">Hay peligro inmediato o necesita atención urgente</option><option value="Media">Necesita atención pronto</option><option value="Baja">No parece haber urgencia inmediata o no lo sé</option></select></label></>}
      {step === 2 && <div className="experienceFields"><label className="reportField"><span>Departamento</span><select value={department} onChange={(event) => { setDepartment(event.target.value); setFacilityId(""); }}><option value="">Elegí un departamento</option>{URUGUAY_DEPARTMENTS.map((name) => <option key={name}>{name}</option>)}</select></label><label className="reportField"><span>ELEPEM</span><select value={facilityId} disabled={!department} onChange={(event) => setFacilityId(event.target.value)}><option value="">{department ? "Elegí un ELEPEM" : "Primero elegí un departamento"}</option>{departmentFacilities.map((facility) => <option value={facility.id} key={facility.id}>{facility.name} · {facility.locality}</option>)}</select><small className="experienceFieldHelp">Sólo se pueden comunicar situaciones vinculadas a un ELEPEM del padrón.</small></label></div>}
      {step === 3 && <PrivacyContactBlock privacy={privacy} contact={contact} onPrivacyChange={setPrivacy} onContactChange={setContact} />}
      {step === 4 && <><div className="reportSummary"><div><strong>ELEPEM</strong><span>{selectedFacility ? `${selectedFacility.name} · ${selectedFacility.locality}` : "Pendiente de seleccionar"}</span></div><div><strong>Preocupaciones</strong><span>{concerns.join(" · ") || "No indicadas"}</span></div><div><strong>Privacidad</strong><span>{privacy}</span></div><div><strong>Archivos</strong><span>{files.length + (recordedAudio ? 1 : 0) ? `${files.length + (recordedAudio ? 1 : 0)} adjunto(s)` : "Sin archivos adjuntos"}</span></div></div><label className="reportCheckbox reportConsent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Entiendo que esta comunicación queda para revisión humana privada y no se publicará automáticamente.</span></label>{!canSubmit && <p className="reportFieldError">Para enviar, elegí un ELEPEM y aceptá la revisión privada.</p>}</>}
      {message && !caseCode && <p className="reportFieldError" role="alert">{message}</p>}
    </div>
    <footer className="reportActions"><button className="reportBack" type="button" disabled={step === 1 || submitting} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />Volver</button><span>Paso {step} de 4</span>{step < 4 ? <button className="reportContinue" type="button" disabled={submitting} onClick={() => setStep((current) => current + 1)}>Continuar <ArrowRight size={17} /></button> : <button className="reportContinue" type="button" disabled={!canSubmit || !enabled || submitting} onClick={() => void submit()}>{submitting ? "Guardando…" : "Guardar y enviar al equipo"}<ArrowRight size={17} /></button>}</footer>
  </section>;
}
