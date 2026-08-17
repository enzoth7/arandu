"use client";
/* eslint-disable @next/next/no-img-element -- las miniaturas requieren la sesión institucional. */

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, EyeOff, FileText, Image as ImageIcon, RefreshCw, Send, ShieldAlert } from "lucide-react";
import {
  EXPERIENCE_DIMENSIONS,
  EXPERIENCE_QUESTIONS,
  EXPERIENCE_SCALE_OPTIONS,
  PARTICIPATION_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESPONDENT_OPTIONS,
} from "../../../lib/experience-questionnaire.mjs";
import type { IntakeKind } from "../../../lib/institutional-types";
import { Modal } from "../Modal";

type Publication = { id: string; status: "draft" | "published" | "withdrawn"; publicBody: string; publicRelationship: string | null; publicPeriod: string | null; publishedAt: string | null };
type Triage = {
  immediateDangerReviewed: boolean;
  safeContactRecorded: boolean;
  relatedCasesSearched: boolean;
  personWillRecorded: boolean;
  priority: "Alta" | "Media" | "Baja" | "Por evaluar";
  scope: string;
  route: string;
};
type InboxReport = {
  id: string; case_code: string; entry_type: IntakeKind; current_status: string; priority: string; demo_facility_id: string | null; report_payload: Record<string, unknown>; created_at: string;
  facility: { id: number; key: string; name: string; locality: string; department: string } | null;
  publication: Publication | null; contacts: Array<{ name?: string; phone?: string; email?: string }>;
  attachments: Array<{ id: string; file_name: string; mime_type: string; purpose: string }>;
  documentReview: { decision: "inadequate" | "clear"; reason: string; createdAt: string } | null;
  events: Array<{ event_data?: { triage?: Partial<Triage> } }>;
};
type PublicationDraft = { publicBody: string; publicRelationship: string; publicPeriod: string };
type Action = "moderate" | "reclassify_sensitive" | "private_review" | "private_facility" | "review" | "contact" | "refer" | "resolve" | "request_info" | "reject" | "approve_preview" | "publish" | "withdraw";
type PendingAction = { report: InboxReport; action: Action; title: string; description: string; openPublicationAfter?: boolean };

const KIND_LABELS: Record<IntakeKind, string> = { concern: "Preocupación", experience: "Experiencia", facility_change: "Solicitud de cambio" };
const STATUS_LABELS: Record<string, string> = { new: "Nueva", received: "Recibida", in_review: "En revisión", triage: "Requiere atención", contact: "En seguimiento", referred: "Derivada", resolved: "Resuelta", closed: "Cerrada" };
const DESTINATION_LABELS: Record<string, string> = { aggregate: "Sólo revisión estatal privada", private_review: "Sólo revisión estatal privada", private_facility: "Envío privado al ELEPEM", consider_anonymized: "Publicación anonimizada en la ficha" };
const ANSWER_LABELS: Record<string, string> = { yes: "Sí", partial: "En parte", no: "No", unknown: "No pudo evaluarlo", prefer_not_to_answer: "Prefirió no responder" };
const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS.map((option) => [option.value, option.label]));
const RESPONDENT_LABELS = Object.fromEntries(RESPONDENT_OPTIONS.map((option) => [option.value, option.label]));
const PARTICIPATION_LABELS = Object.fromEntries(PARTICIPATION_OPTIONS.map((option) => [option.value, option.label]));
const PRIVACY_LABELS: Record<string, string> = { anonymous: "Anónima", confidential: "Confidencial", registered_identity: "Con identidad registrada" };
const CATEGORY_LABELS: Record<string, string> = { outstanding: "Sobresaliente", good: "Bueno", requires_improvement: "Requiere mejoras", inadequate: "Inadecuado" };

function textValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function triagePriority(value: unknown): Triage["priority"] | null { return value === "Alta" || value === "Media" || value === "Baja" || value === "Por evaluar" ? value : null; }
function recordValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function isV5Experience(report: InboxReport) { return report.entry_type === "experience" && report.report_payload.version === 5; }
function reportSummary(report: InboxReport) { return textValue(report.report_payload.narrative) || (report.entry_type === "experience" ? "Experiencia estructurada sin relato adicional." : report.entry_type === "facility_change" ? textValue(report.report_payload.evidenceNote) || "Solicitud de actualización de ficha." : "Preocupación sin relato adicional."); }
function facilityLabel(report: InboxReport) { return report.facility ? `${report.facility.name} · ${report.facility.locality} · ${report.facility.department}` : "Sin ELEPEM vinculado"; }
function publicationDraft(report: InboxReport): PublicationDraft {
  if (isV5Experience(report)) {
    return {
      publicBody: report.publication?.publicBody || "",
      publicRelationship: report.publication?.publicRelationship || "",
      publicPeriod: "",
    };
  }
  return { publicBody: report.publication?.publicBody || reportSummary(report), publicRelationship: report.publication?.publicRelationship || textValue(report.report_payload.relationship), publicPeriod: report.publication?.publicPeriod || textValue(report.report_payload.period) };
}
function canPublishExperience(report: InboxReport) {
  return report.report_payload.requestedDestination === "consider_anonymized"
    && report.report_payload.publicationConsent === true;
}

function answerLabel(scale: "frequency" | "fulfillment", value: unknown) {
  return EXPERIENCE_SCALE_OPTIONS[scale].find((option) => option.value === value)?.label || "Sin respuesta";
}

function ExperienceInformation({ report }: { report: InboxReport }) {
  if (!isV5Experience(report)) {
    return <><h3>Experiencia recibida</h3><dl className="stateExperienceSummary"><div><dt>Vínculo</dt><dd>{textValue(report.report_payload.relationship) || "No informado"}</dd></div><div><dt>Período</dt><dd>{textValue(report.report_payload.period) || "No informado"}</dd></div><div><dt>Destino solicitado</dt><dd>{DESTINATION_LABELS[textValue(report.report_payload.requestedDestination)] || "Sólo revisión estatal privada"}</dd></div></dl><p className="stateInboxNarrative">{reportSummary(report)}</p><div className="stateExperienceAnswers">{Object.entries(recordValue(report.report_payload.answers)).map(([key, answer]) => <div key={key}><span>{key}</span><strong>{ANSWER_LABELS[textValue(answer)] || "Sin respuesta"}</strong></div>)}</div></>;
  }

  const answers = recordValue(report.report_payload.answers);
  const results = recordValue(report.report_payload.dimensionResults);
  const futureAuthorizations = recordValue(report.report_payload.futureAuthorizations);
  const relationship = textValue(report.report_payload.relationship);
  const relationshipOther = textValue(report.report_payload.relationshipOther);
  const directWording = textValue(report.report_payload.respondentType) === "current_resident";

  return <>
    <h3>Experiencia recibida</h3>
    <div className="stateExperienceSummary"><dl>
        <div><dt>Vínculo</dt><dd>{RELATIONSHIP_LABELS[relationship] || "No informado"}{relationship === "other" && relationshipOther ? ` ${relationshipOther}` : ""}</dd></div>
        <div><dt>Quién respondió</dt><dd>{RESPONDENT_LABELS[textValue(report.report_payload.respondentType)] || "No informado"}</dd></div>
        <div><dt>Participación de la persona residente</dt><dd>{PARTICIPATION_LABELS[textValue(report.report_payload.residentParticipation)] || "No informado"}</dd></div>
        <div><dt>Privacidad</dt><dd>{PRIVACY_LABELS[textValue(report.report_payload.privacyMode)] || "No informada"}</dd></div>
        <div><dt>Destino solicitado</dt><dd>{DESTINATION_LABELS[textValue(report.report_payload.requestedDestination)] || "Sólo revisión estatal privada"}</dd></div>
    </dl></div>
    <h4>Relato privado</h4>
    <p className="stateInboxNarrative">{reportSummary(report)}</p>
    <h4>Respuestas y resultados privados</h4>
    <div>
      {EXPERIENCE_DIMENSIONS.map((dimension) => {
        const result = recordValue(results[dimension.id]);
        const resultSummary = typeof result.average === "number"
          ? `${result.average.toFixed(2)} · ${CATEGORY_LABELS[textValue(result.category)] || "Sin categoría"}`
          : "Sin información suficiente";
        return <section className="stateExperienceSummary" key={dimension.id} aria-label={dimension.title}>
          <h4>{dimension.title}</h4>
          <p><strong>Resultado interno:</strong> {resultSummary} · {typeof result.scoredCount === "number" ? result.scoredCount : 0} puntuadas · {typeof result.excludedCount === "number" ? result.excludedCount : 0} excluidas.</p>
          <div className="stateExperienceAnswers">{EXPERIENCE_QUESTIONS.filter((question) => question.dimensionId === dimension.id).map((question) => <div key={question.id}><span>{question.number}. {directWording ? question.directText : question.representativeText}</span><strong>{answerLabel(question.scale, answers[question.id])}</strong></div>)}</div>
        </section>;
      })}
    </div>
    <h4>Autorizaciones privadas</h4>
    <div className="stateExperienceSummary"><dl><div><dt>Enviar copia al ELEPEM</dt><dd>{futureAuthorizations.sendToFacility === true ? "Solicitado" : "No solicitado"}</dd></div><div><dt>Compartir contacto con el ELEPEM</dt><dd>{futureAuthorizations.shareContactWithFacility === true ? "Autorizado" : "No autorizado"}</dd></div>{futureAuthorizations.publicName === true && <div><dt>Mostrar nombre público en el futuro</dt><dd>Autorizado en un formulario anterior</dd></div>}</dl></div>
  </>;
}
function triageFor(report: InboxReport): Triage {
  const saved = [...(report.events || [])].reverse().find((event) => event.event_data?.triage)?.event_data?.triage;
  return {
    immediateDangerReviewed: saved?.immediateDangerReviewed === true,
    safeContactRecorded: saved?.safeContactRecorded === true,
    relatedCasesSearched: saved?.relatedCasesSearched === true,
    personWillRecorded: saved?.personWillRecorded === true,
    priority: triagePriority(saved?.priority) || triagePriority(report.priority) || "Por evaluar",
    scope: textValue(saved?.scope),
    route: textValue(saved?.route),
  };
}

export function StateInbox() {
  const [reports, setReports] = useState<InboxReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState<"information" | "actions">("information");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [publicationEditorId, setPublicationEditorId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, PublicationDraft>>({});
  const [triage, setTriage] = useState<Record<string, Triage>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [documentReasons, setDocumentReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState(""); const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  async function load() { setLoading(true); setError(""); try { const response = await fetch("/api/institutional/state/inbox", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo cargar."); const nextReports = Array.isArray(result.reports) ? result.reports as InboxReport[] : []; setReports(nextReports); setDrafts(Object.fromEntries(nextReports.map((report) => [report.id, publicationDraft(report)]))); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo cargar."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const selected = reports.find((report) => report.id === selectedId) || reports[0] || null;
  const selectedTriage: Triage | null = selected ? (triage[selected.id] || triageFor(selected)) : null;
  function updateTriage(field: keyof Triage, value: Triage[keyof Triage]) { if (!selected || !selectedTriage) return; setTriage((current) => ({ ...current, [selected.id]: { ...selectedTriage, [field]: value } })); }
  async function requestDecision(report: InboxReport, action: Action, triagePayload?: Triage) { setBusyId(report.id); setError(""); try { const response = await fetch("/api/institutional/state/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: report.id, action, note: note[report.id] || "", triage: triagePayload }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo guardar."); await load(); setFeedback("Decisión guardada."); return true; } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : "No se pudo guardar."); return false; } finally { setBusyId(""); } }
  async function saveTriage() { if (!selected || !selectedTriage) return; const saved = await requestDecision(selected, "review", selectedTriage); if (saved) setDetailTab("information"); }
  async function publish(report: InboxReport) { const draft = drafts[report.id] || publicationDraft(report); setBusyId(report.id); try { const response = await fetch(`/api/institutional/state/experiences/${report.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo publicar."); await load(); setPublicationEditorId(""); setFeedback("Experiencia publicada en la ficha del ELEPEM."); } catch (publishError) { setError(publishError instanceof Error ? publishError.message : "No se pudo publicar."); } finally { setBusyId(""); } }
  async function withdraw(report: InboxReport) { setBusyId(report.id); try { const response = await fetch(`/api/institutional/state/experiences/${report.id}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: note[report.id] || "Retirada durante la revisión estatal." }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo retirar."); await load(); setFeedback("La experiencia fue retirada de la ficha."); } catch (withdrawError) { setError(withdrawError instanceof Error ? withdrawError.message : "No se pudo retirar."); } finally { setBusyId(""); } }
  async function saveDocumentStatus(decision: "inadequate" | "clear") { if (!selected?.facility) return; const reason = documentReasons[selected.id] || ""; setBusyId(selected.id); try { const response = await fetch("/api/institutional/state/facility-document-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityId: selected.facility.id, decision, reason }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo guardar."); await load(); setFeedback(decision === "inadequate" ? "Estado documental interno marcado como Inadecuado." : "Estado documental interno restablecido."); setDocumentReasons((current) => ({ ...current, [selected.id]: "" })); } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "No se pudo guardar."); } finally { setBusyId(""); } }
  function updateDraft(reportId: string, field: keyof PublicationDraft, value: string) { setDrafts((current) => ({ ...current, [reportId]: { ...(current[reportId] || publicationDraft(reports.find((report) => report.id === reportId) as InboxReport)), [field]: value } })); }
  async function confirmPendingAction() { if (!pendingAction) return; const pending = pendingAction; setPendingAction(null); if (pending.action === "publish") return publish(pending.report); if (pending.action === "withdraw") return withdraw(pending.report); const saved = await requestDecision(pending.report, pending.action); if (saved && pending.openPublicationAfter) { setPublicationEditorId(pending.report.id); setDetailTab("actions"); } }
  function openPublication(report: InboxReport) { if (!canPublishExperience(report)) return; setPendingAction({ report, action: "moderate", title: "¿Preparar esta experiencia para publicar?", description: "Se abrirá una versión privada para anonimizar y revisar. Todavía no se publicará.", openPublicationAfter: true }); }
  function declinePublication(report: InboxReport) { const privateAction: Action = report.report_payload.requestedDestination === "private_facility" ? "private_facility" : "private_review"; setPendingAction({ report, action: privateAction, title: "¿No publicar esta experiencia?", description: "La decisión quedará registrada y la experiencia continuará solamente en el destino privado solicitado." }); }
  const selectedDraft = selected ? (drafts[selected.id] || publicationDraft(selected)) : null;
  const showPublicationEditor = Boolean(selected && selected.entry_type === "experience" && canPublishExperience(selected) && (publicationEditorId === selected.id || selected.publication));

  return (
    <section className="institutionalWorkspace stateInboxWorkspace">
      <header className="institutionalPageHeader">
        <div><h1>Revisión estatal</h1><p>Seleccioná una entrada, revisá su información y registrá una acción trazable.</p></div>
        <button type="button" className="reportBack" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />Actualizar</button>
      </header>
      {error && <p className="reportFieldError" role="alert"><ShieldAlert size={17} />{error}</p>}
      {feedback && <p className="stateInboxFeedback" role="status"><CheckCircle2 size={17} />{feedback}</p>}
      {loading ? <p role="status">Cargando bandeja…</p> : reports.length > 0 ? <div className="stateInboxLayout">
        <aside className="stateInboxQueue" aria-label="Lista de expedientes">
          {reports.map((report) => <button type="button" className={selected?.id === report.id ? "isSelected" : ""} aria-current={selected?.id === report.id ? "true" : undefined} onClick={() => { setSelectedId(report.id); setDetailTab("information"); setPublicationEditorId(""); }} key={report.id}><span><em className={`stateInboxKind stateInboxKind-${report.entry_type}`}>{KIND_LABELS[report.entry_type]}</em><strong>{report.facility?.name || "Sin ELEPEM vinculado"}</strong><small>{new Date(report.created_at).toLocaleDateString("es-UY")}</small></span><span><small>{STATUS_LABELS[report.current_status] || report.current_status}</small></span><ChevronRight size={18} aria-hidden="true" /></button>)}
        </aside>
        {selected && <article className="stateInboxDetail">
          <header><div><small>{selected.case_code} · {new Date(selected.created_at).toLocaleString("es-UY")}</small><h2>{facilityLabel(selected)}</h2></div><div className="stateInboxHeaderBadges"><span className={`stateInboxKind stateInboxKind-${selected.entry_type}`}>{KIND_LABELS[selected.entry_type]}</span><span className="sourceBadge sourceBadge-gray">{STATUS_LABELS[selected.current_status] || selected.current_status}</span></div></header>
          <div className="stateInboxDetailTabs" role="tablist" aria-label="Detalle del expediente"><button type="button" role="tab" aria-selected={detailTab === "information"} className={detailTab === "information" ? "active" : ""} onClick={() => setDetailTab("information")}>Información</button><button type="button" role="tab" aria-selected={detailTab === "actions"} className={detailTab === "actions" ? "active" : ""} onClick={() => setDetailTab("actions")}>Acciones</button></div>
          {detailTab === "information" ? <section className="stateInboxInformation" aria-label="Información del expediente">
            {selected.entry_type === "experience" ? <ExperienceInformation report={selected} /> : <><p className="stateInboxNarrative">{reportSummary(selected)}</p>{selected.entry_type === "facility_change" && selected.report_payload.removeCurrentPhoto === true && <p className="stateInboxNarrative"><strong>Foto actual:</strong> se solicitó su retiro. Seguirá publicada hasta que el Estado revise y resuelva el expediente.</p>}</>}
            {selected.contacts.length > 0 && <section className="stateInboxPrivateData"><h3>Contacto privado</h3><p>{[selected.contacts[0]?.name, selected.contacts[0]?.phone, selected.contacts[0]?.email].filter(Boolean).join(" · ")}</p></section>}
            {selected.attachments.length > 0 && <section className="stateInboxPrivateData"><h3>Adjuntos privados</h3><ul className="stateAttachmentList">{selected.attachments.map((attachment) => <li key={attachment.id}>{attachment.mime_type.startsWith("image/") ? <img src={`/api/institutional/attachments/${attachment.id}`} alt={`Adjunto privado: ${attachment.file_name}`} /> : <FileText size={18} aria-hidden="true" />}<a href={`/api/institutional/attachments/${attachment.id}`} target="_blank" rel="noreferrer">{attachment.file_name}</a>{attachment.mime_type.startsWith("image/") && <ImageIcon size={15} aria-hidden="true" />}</li>)}</ul></section>}
          </section> : <section className="stateInboxActions" aria-label="Acciones de revisión">
            <div className="stateTriagePanel"><h3>1. Revisar seguridad y alcance</h3><label className="reportCheckbox"><input type="checkbox" checked={selectedTriage?.immediateDangerReviewed || false} onChange={(event) => updateTriage("immediateDangerReviewed", event.target.checked)} /><span>Se revisó si existe peligro inmediato</span></label><label className="reportCheckbox"><input type="checkbox" checked={selectedTriage?.safeContactRecorded || false} onChange={(event) => updateTriage("safeContactRecorded", event.target.checked)} /><span>Se registró una forma de contacto seguro</span></label><label className="reportCheckbox"><input type="checkbox" checked={selectedTriage?.relatedCasesSearched || false} onChange={(event) => updateTriage("relatedCasesSearched", event.target.checked)} /><span>Se buscaron entradas o casos relacionados</span></label><label className="reportCheckbox"><input type="checkbox" checked={selectedTriage?.personWillRecorded || false} onChange={(event) => updateTriage("personWillRecorded", event.target.checked)} /><span>Se registró la voluntad de la persona o la posibilidad de contactarla</span></label><div className="reportFieldGrid"><label className="reportField"><span>Nivel de urgencia</span><select value={selectedTriage?.priority || "Por evaluar"} onChange={(event) => updateTriage("priority", event.target.value as Triage["priority"])}><option value="Por evaluar">Por evaluar</option><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></label><label className="reportField"><span>¿Está dentro del alcance del servicio?</span><select value={selectedTriage?.scope || ""} onChange={(event) => updateTriage("scope", event.target.value)}><option value="">Pendiente de determinar</option><option value="Sí">Sí</option><option value="No">No</option></select></label><label className="reportField"><span>Ruta principal sugerida</span><select value={selectedTriage?.route || ""} onChange={(event) => updateTriage("route", event.target.value)}><option value="">Pendiente de determinar</option><option>Equipo especializado / Inmayores</option><option>Dirección Departamental de Salud</option><option>ELEPEM, comunicación privada</option><option>Otro circuito institucional</option></select></label></div><label className="reportField stateInboxNote"><span>Nota de triaje</span><textarea value={note[selected.id] || ""} onChange={(event) => setNote((current) => ({ ...current, [selected.id]: event.target.value }))} maxLength={4000} placeholder="Distinguir hechos comunicados, información faltante y decisión de recepción." /></label><button type="button" className="reportContinue" disabled={busyId === selected.id} onClick={() => void saveTriage()}>Guardar revisión</button></div>
            <section className="stateInboxDecision">
              <h3>Acciones específicas</h3>
              <div className="institutionalCardActions">
                {selected.entry_type === "experience" ? <>
                  <div className="statePublicationChoice">
                    <strong>¿Publicar esta experiencia?</strong>
                    <p>La publicación nunca es automática. Requiere consentimiento, anonimización y una confirmación final.</p>
                    {!canPublishExperience(selected) && <p className="statePublicationUnavailable">No se puede publicar: la persona no solicitó publicación anonimizada con consentimiento.</p>}
                    <div className="institutionalCardActions">
                      <button type="button" className="reportContinue" disabled={busyId === selected.id || selected.publication?.status === "published" || !canPublishExperience(selected)} onClick={() => openPublication(selected)}><Send size={17} />Publicar</button>
                      <button type="button" className="reportBack" disabled={busyId === selected.id || selected.publication?.status === "published"} onClick={() => declinePublication(selected)}><EyeOff size={17} />No publicar</button>
                    </div>
                  </div>
                  <button type="button" className="reportBack" disabled={busyId === selected.id || selected.publication?.status === "published"} onClick={() => setPendingAction({ report: selected, action: "reclassify_sensitive", title: "¿Tratarla como preocupación?", description: "La experiencia pasará al circuito privado de preocupaciones sensibles." })}><AlertTriangle size={17} />Tratar como preocupación</button>
                </> : <>
                  {selected.entry_type === "facility_change" && <button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => setPendingAction({ report: selected, action: "request_info", title: "¿Pedir información?", description: "El ELEPEM podrá responder desde su portal de prueba." })}>Pedir información</button>}
                  <button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => setPendingAction({
                    report: selected,
                    action: selected.entry_type === "facility_change" ? "approve_preview" : "resolve",
                    title: selected.entry_type === "facility_change" ? "¿Aprobar y publicar las fotos?" : "¿Confirmar acción?",
                    description: selected.entry_type === "facility_change"
                      ? "Las fotos autorizadas quedarán visibles en el portal y la decisión será auditable."
                      : "La decisión quedará registrada de forma auditable.",
                  })}>{selected.entry_type === "facility_change" ? "Aprobar y publicar fotos" : "Resolver"}</button>
                </>}
              </div>
            </section>
            {selected.facility && <section className="stateDocumentStatus"><h3>Estado documental interno</h3><p>Este estado no se muestra al público y no representa una evaluación de calidad o seguridad.</p>{selected.documentReview?.decision === "inadequate" && <p className="stateInternalStatus"><strong>Inadecuado interno vigente.</strong> {selected.documentReview.reason}</p>}<label className="reportField"><span>Fundamento</span><textarea value={documentReasons[selected.id] || ""} onChange={(event) => setDocumentReasons((current) => ({ ...current, [selected.id]: event.target.value }))} minLength={10} maxLength={4000} /></label><div className="institutionalCardActions"><button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => void saveDocumentStatus("inadequate")}>Marcar Inadecuado</button><button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => void saveDocumentStatus("clear")}>Restablecer automático</button></div></section>}
            {showPublicationEditor && selectedDraft && <section className="institutionalPublicationEditor"><h3>Preparar publicación</h3><p>Escribí una versión nueva, anonimizada y sin datos de contacto ni puntajes internos.</p><label className="reportField"><span>Texto que verá el público</span><textarea value={selectedDraft.publicBody} onChange={(event) => updateDraft(selected.id, "publicBody", event.target.value)} minLength={10} maxLength={4000} /></label><div className="reportFieldGrid"><label className="reportField"><span>Vínculo</span><input value={selectedDraft.publicRelationship} onChange={(event) => updateDraft(selected.id, "publicRelationship", event.target.value)} maxLength={120} /></label>{!isV5Experience(selected) && <label className="reportField"><span>Período</span><input value={selectedDraft.publicPeriod} onChange={(event) => updateDraft(selected.id, "publicPeriod", event.target.value)} maxLength={120} /></label>}</div><button type="button" className="reportContinue statePublishButton" disabled={busyId === selected.id || selectedDraft.publicBody.trim().length < 10} onClick={() => setPendingAction({ report: selected, action: "publish", title: "¿Publicar experiencia?", description: "El texto moderado aparecerá en la ficha pública." })}><Send size={17} />Confirmar publicación</button></section>}
            {selected.entry_type === "experience" && selected.publication?.status === "published" && <button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => setPendingAction({ report: selected, action: "withdraw", title: "¿Retirar publicación?", description: "La experiencia dejará de aparecer en la ficha pública." })}><EyeOff size={17} />Retirar publicación</button>}
          </section>}
        </article>}
      </div> : <p className="registryEmptyResults">No hay entradas en esta cola.</p>}
      <Modal open={Boolean(pendingAction)} onClose={() => setPendingAction(null)} title={pendingAction?.title || "Confirmar acción"} className="stateActionModal"><div className="stateActionModalContent"><CheckCircle2 size={34} /><h2>{pendingAction?.title}</h2><p>{pendingAction?.description}</p><div className="stateActionModalButtons"><button type="button" className="reportBack" onClick={() => setPendingAction(null)}>Cancelar</button><button type="button" className="reportContinue" onClick={() => void confirmPendingAction()}>Aceptar</button></div></div></Modal>
    </section>
  );
}
