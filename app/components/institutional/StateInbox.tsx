"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, EyeOff, RefreshCw, Send, ShieldAlert } from "lucide-react";
import type { IntakeKind } from "../../../lib/institutional-types";
import { Modal } from "../Modal";

type Publication = {
  id: string;
  status: "draft" | "published" | "withdrawn";
  publicBody: string;
  publicRelationship: string | null;
  publicPeriod: string | null;
  publishedAt: string | null;
};

type InboxReport = {
  id: string;
  case_code: string;
  entry_type: IntakeKind;
  current_status: string;
  priority: string;
  demo_facility_id: string | null;
  report_payload: Record<string, unknown>;
  created_at: string;
  facility: { id: number; key: string; name: string; locality: string; department: string } | null;
  publication: Publication | null;
  contacts: Array<{ name?: string; phone?: string; email?: string }>;
  attachments: Array<{ id: string; file_name: string; purpose: string }>;
};

type PublicationDraft = {
  publicBody: string;
  publicRelationship: string;
  publicPeriod: string;
};

type PendingAction = {
  report: InboxReport;
  action: "moderate" | "reclassify_sensitive" | "accept_aggregate" | "private_facility" | "review" | "contact" | "refer" | "resolve" | "request_info" | "reject" | "approve_preview" | "publish" | "withdraw";
  title: string;
  description: string;
  openPublicationAfter?: boolean;
};

const TABS: Array<[IntakeKind, string]> = [
  ["concern", "Preocupaciones"],
  ["experience", "Experiencias"],
  ["facility_change", "Solicitudes de cambio"],
];

const OTHER_ACTIONS: Record<Exclude<IntakeKind, "experience">, Array<[PendingAction["action"], string, string]>> = {
  concern: [
    ["review", "Revisar", "Marcar la preocupación como revisada por el equipo."],
    ["contact", "Registrar actuación", "Registrar que hubo un contacto o una actuación de seguimiento."],
    ["refer", "Derivar", "Derivar esta preocupación para su tratamiento."],
    ["resolve", "Resolver", "Cerrar la revisión de esta preocupación."],
  ],
  facility_change: [
    ["request_info", "Pedir información", "Solicitar más información al ELEPEM."],
    ["reject", "Rechazar", "Rechazar la solicitud de cambio."],
    ["approve_preview", "Aprobar vista previa", "Aprobar solamente una comparación privada, sin modificar el padrón."],
  ],
};

const QUESTIONS: Array<[string, string]> = [
  ["daily_life", "Rutinas y preferencias"],
  ["communication", "Información del equipo"],
  ["participation", "Participación en decisiones"],
  ["environment", "Accesibilidad, limpieza y seguridad"],
  ["contact", "Vínculo con familiares o referentes"],
];

const ANSWER_LABELS: Record<string, string> = {
  yes: "Sí",
  partial: "En parte",
  no: "No",
  unknown: "No pudo evaluarlo",
  prefer_not_to_answer: "Prefirió no responder",
};

const DESTINATION_LABELS: Record<string, string> = {
  aggregate: "Resumen agregado",
  private_facility: "Envío privado al ELEPEM",
  consider_anonymized: "Publicación anonimizada en la ficha",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nueva",
  in_review: "En revisión",
  triage: "Requiere atención",
  contact: "En seguimiento",
  referred: "Derivada",
  resolved: "Resuelta",
  closed: "Cerrada",
};

const PUBLICATION_LABELS: Record<Publication["status"], string> = {
  draft: "Borrador",
  published: "Publicada",
  withdrawn: "Retirada",
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function reportSummary(report: InboxReport) {
  const narrative = textValue(report.report_payload.narrative);
  if (narrative) return narrative;
  if (report.entry_type === "experience") return "Experiencia estructurada sin relato adicional.";
  if (report.entry_type === "facility_change") return textValue(report.report_payload.evidenceNote) || "Solicitud de actualización de ficha.";
  return "Preocupación sin relato adicional.";
}

function facilityLabel(report: InboxReport) {
  if (report.facility) return `${report.facility.name} · ${report.facility.locality} · ${report.facility.department}`;
  return textValue(report.report_payload.facilityId) || report.demo_facility_id || "Sin ELEPEM vinculado";
}

function suggestedPublicBody(report: InboxReport) {
  const narrative = reportSummary(report);
  return narrative.length >= 10 ? narrative : `Experiencia compartida: ${narrative}`;
}

function publicationDraft(report: InboxReport): PublicationDraft {
  return {
    publicBody: report.publication?.publicBody || suggestedPublicBody(report),
    publicRelationship: report.publication?.publicRelationship || textValue(report.report_payload.relationship),
    publicPeriod: report.publication?.publicPeriod || textValue(report.report_payload.period),
  };
}

function canPublishExperience(report: InboxReport) {
  return report.report_payload.requestedDestination === "consider_anonymized"
    && report.report_payload.publicationConsent === true;
}

export function StateInbox() {
  const [tab, setTab] = useState<IntakeKind>("concern");
  const [reports, setReports] = useState<InboxReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [publicationEditorId, setPublicationEditorId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, PublicationDraft>>({});
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/institutional/state/inbox", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar.");
      const loadedReports = Array.isArray(result.reports) ? result.reports as InboxReport[] : [];
      setReports(loadedReports);
      setDrafts(Object.fromEntries(loadedReports.map((report) => [report.id, publicationDraft(report)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => reports.filter((report) => report.entry_type === tab), [reports, tab]);
  const selected = visible.find((report) => report.id === selectedId) || visible[0] || null;

  function selectTab(kind: IntakeKind) {
    setTab(kind);
    setSelectedId("");
    setPublicationEditorId("");
    setFeedback("");
  }

  async function requestDecision(report: InboxReport, action: PendingAction["action"]) {
    setBusyId(report.id);
    setError("");
    try {
      const response = await fetch("/api/institutional/state/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, action, note: note[report.id] || "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      await load();
      setFeedback("Decisión guardada.");
      return true;
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "No se pudo guardar.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function publish(report: InboxReport) {
    const draft = drafts[report.id] || publicationDraft(report);
    setBusyId(report.id);
    setError("");
    try {
      const response = await fetch(`/api/institutional/state/experiences/${report.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo publicar.");
      await load();
      setPublicationEditorId("");
      setFeedback(result.alreadyPublished ? "La experiencia ya estaba publicada." : "Experiencia publicada en la ficha del ELEPEM.");
      return true;
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "No se pudo publicar.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function withdraw(report: InboxReport) {
    setBusyId(report.id);
    setError("");
    try {
      const response = await fetch(`/api/institutional/state/experiences/${report.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: note[report.id] || "Retirada durante la revisión estatal." }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo retirar.");
      await load();
      setFeedback("La experiencia fue retirada de la ficha.");
      return true;
    } catch (withdrawError) {
      setError(withdrawError instanceof Error ? withdrawError.message : "No se pudo retirar.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const pending = pendingAction;
    setPendingAction(null);
    if (pending.action === "publish") {
      await publish(pending.report);
      return;
    }
    if (pending.action === "withdraw") {
      await withdraw(pending.report);
      return;
    }
    const saved = await requestDecision(pending.report, pending.action);
    if (saved && pending.openPublicationAfter) setPublicationEditorId(pending.report.id);
  }

  function updateDraft(reportId: string, field: keyof PublicationDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [reportId]: { ...(current[reportId] || { publicBody: "", publicRelationship: "", publicPeriod: "" }), [field]: value },
    }));
  }

  function openExperienceModeration(report: InboxReport) {
    if (canPublishExperience(report)) {
      setPendingAction({
        report,
        action: "moderate",
        title: "¿Aceptar esta experiencia?",
        description: "La experiencia pasará al último paso para revisar el texto y publicarlo en la ficha.",
        openPublicationAfter: true,
      });
      return;
    }
    const destination = textValue(report.report_payload.requestedDestination);
    const action = destination === "private_facility" ? "private_facility" : "accept_aggregate";
    setPendingAction({
      report,
      action,
      title: "¿Aceptar esta experiencia?",
      description: destination === "private_facility"
        ? "Quedará preparada para un envío privado al ELEPEM."
        : "Se aceptará solamente para un resumen agregado, sin publicación individual.",
    });
  }

  const selectedDraft = selected ? (drafts[selected.id] || publicationDraft(selected)) : null;
  const publicationEditable = selected?.publication?.status !== "published" && selected?.publication?.status !== "withdrawn";
  const showPublicationEditor = Boolean(
    selected
    && selected.entry_type === "experience"
    && canPublishExperience(selected)
    && (publicationEditorId === selected.id || selected.publication),
  );

  return <section className="institutionalWorkspace stateInboxWorkspace">
    <header className="institutionalPageHeader">
      <div><h1>Revisión estatal</h1><p>Seleccioná una entrada, revisá la información y elegí una acción.</p></div>
      <button type="button" className="reportBack" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />Actualizar</button>
    </header>

    <div className="institutionalTabs" role="tablist" aria-label="Colas de revisión">
      {TABS.map(([kind, label]) => <button key={kind} role="tab" aria-selected={tab === kind} className={tab === kind ? "active" : ""} onClick={() => selectTab(kind)}>{label}<span>{reports.filter((report) => report.entry_type === kind).length}</span></button>)}
    </div>

    {error && <p className="reportFieldError" role="alert"><ShieldAlert size={17} />{error}</p>}
    {feedback && <p className="stateInboxFeedback" role="status"><CheckCircle2 size={17} />{feedback}</p>}

    {loading ? <p role="status">Cargando bandeja…</p> : visible.length > 0 ? (
      <div className="stateInboxLayout">
        <aside className="stateInboxQueue" aria-label={`Lista de ${TABS.find(([kind]) => kind === tab)?.[1].toLowerCase()}`}>
          {visible.map((report) => (
            <button
              type="button"
              className={selected?.id === report.id ? "isSelected" : ""}
              aria-current={selected?.id === report.id ? "true" : undefined}
              onClick={() => { setSelectedId(report.id); setPublicationEditorId(""); setFeedback(""); }}
              key={report.id}
            >
              <span><strong>{report.facility?.name || "Sin ELEPEM vinculado"}</strong><small>{new Date(report.created_at).toLocaleDateString("es-UY")}</small></span>
              <span><small>{STATUS_LABELS[report.current_status] || report.current_status}</small>{report.publication && <em>{PUBLICATION_LABELS[report.publication.status]}</em>}</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
        </aside>

        {selected && <article className="stateInboxDetail">
          <header>
            <div><small>{selected.case_code} · {new Date(selected.created_at).toLocaleString("es-UY")}</small><h2>{facilityLabel(selected)}</h2></div>
            <span className="sourceBadge sourceBadge-gray">{STATUS_LABELS[selected.current_status] || selected.current_status}</span>
          </header>

          {selected.entry_type === "experience" ? <>
            <section className="stateExperienceSummary" aria-labelledby="experience-detail-title">
              <h3 id="experience-detail-title">Experiencia recibida</h3>
              <dl>
                <div><dt>Vínculo</dt><dd>{textValue(selected.report_payload.relationship) || "No informado"}</dd></div>
                <div><dt>Período</dt><dd>{textValue(selected.report_payload.period) || "No informado"}</dd></div>
                <div><dt>Destino solicitado</dt><dd>{DESTINATION_LABELS[textValue(selected.report_payload.requestedDestination)] || "No informado"}</dd></div>
                <div><dt>Publicación autorizada</dt><dd>{selected.report_payload.publicationConsent === true ? "Sí, con moderación previa" : "No"}</dd></div>
              </dl>
              <div className="stateExperienceNarrative"><span>Relato</span><p>{reportSummary(selected)}</p></div>
              <div className="stateExperienceAnswers">
                {QUESTIONS.map(([key, label]) => {
                  const answers = selected.report_payload.answers && typeof selected.report_payload.answers === "object"
                    ? selected.report_payload.answers as Record<string, unknown>
                    : {};
                  const answer = textValue(answers[key]);
                  return <div key={key}><span>{label}</span><strong className={`answer-${answer || "unknown"}`}>{ANSWER_LABELS[answer] || "Sin respuesta"}</strong></div>;
                })}
              </div>
            </section>
          </> : <p className="stateInboxNarrative">{reportSummary(selected)}</p>}

          {selected.contacts.length > 0 && <section className="stateInboxPrivateData"><h3>Contacto privado</h3><p>{[selected.contacts[0]?.name, selected.contacts[0]?.phone, selected.contacts[0]?.email].filter(Boolean).join(" · ")}</p></section>}
          {selected.attachments.length > 0 && <section className="stateInboxPrivateData"><h3>Adjuntos</h3><ul>{selected.attachments.map((attachment) => <li key={attachment.id}>{attachment.file_name}</li>)}</ul></section>}

          <label className="reportField stateInboxNote"><span>Nota interna (opcional)</span><textarea value={note[selected.id] || ""} onChange={(event) => setNote((current) => ({ ...current, [selected.id]: event.target.value }))} maxLength={4000} /></label>

          <section className="stateInboxDecision" aria-label="Acciones de revisión">
            <h3>Decisión</h3>
            <div className="institutionalCardActions">
              {selected.entry_type === "experience" ? <>
                {selected.publication?.status !== "published" && selected.publication?.status !== "withdrawn" && <button type="button" className="reportContinue" disabled={busyId === selected.id} onClick={() => openExperienceModeration(selected)}><CheckCircle2 size={17} />Moderar</button>}
                <button type="button" className="reportBack" disabled={busyId === selected.id || selected.publication?.status === "published"} onClick={() => setPendingAction({ report: selected, action: "reclassify_sensitive", title: "¿Tratarla como preocupación?", description: "La experiencia pasará al circuito privado de preocupaciones sensibles." })}><AlertTriangle size={17} />Tratar como preocupación</button>
              </> : OTHER_ACTIONS[selected.entry_type].map(([action, label, description]) => <button type="button" className="reportBack" key={action} disabled={busyId === selected.id} onClick={() => setPendingAction({ report: selected, action, title: `¿${label}?`, description })}>{label}</button>)}
            </div>
          </section>

          {selected.entry_type === "experience" && selected.publication?.status === "published" && <section className="statePublishedExperience">
            <div><CheckCircle2 size={20} /><div><h3>Publicada en la ficha</h3><p>{selected.publication.publicBody}</p></div></div>
            <button type="button" className="reportBack" disabled={busyId === selected.id} onClick={() => setPendingAction({ report: selected, action: "withdraw", title: "¿Retirar esta experiencia?", description: "Dejará de aparecer en la ficha pública del ELEPEM." })}><EyeOff size={17} />Retirar publicación</button>
          </section>}

          {showPublicationEditor && selectedDraft && <section className="institutionalPublicationEditor" aria-label="Preparar publicación">
            <header><div><h3>Último paso: publicar en la ficha</h3><p>Revisá que el texto no incluya nombres ni datos que identifiquen a personas.</p></div>{selected.publication && <span className="sourceBadge sourceBadge-gray">{PUBLICATION_LABELS[selected.publication.status]}</span>}</header>
            <label className="reportField"><span>Texto que verá el público</span><textarea disabled={!publicationEditable} value={selectedDraft.publicBody} onChange={(event) => updateDraft(selected.id, "publicBody", event.target.value)} minLength={10} maxLength={4000} /></label>
            <div className="reportFieldGrid">
              <label className="reportField"><span>Vínculo (opcional)</span><input disabled={!publicationEditable} value={selectedDraft.publicRelationship} onChange={(event) => updateDraft(selected.id, "publicRelationship", event.target.value)} maxLength={120} /></label>
              <label className="reportField"><span>Período (opcional)</span><input disabled={!publicationEditable} value={selectedDraft.publicPeriod} onChange={(event) => updateDraft(selected.id, "publicPeriod", event.target.value)} maxLength={120} /></label>
            </div>
            <button type="button" className="reportContinue statePublishButton" disabled={busyId === selected.id || !publicationEditable || selectedDraft.publicBody.trim().length < 10} onClick={() => setPendingAction({ report: selected, action: "publish", title: "¿Publicar esta experiencia?", description: "El texto moderado aparecerá inmediatamente en la ficha de este ELEPEM." })}><Send size={17} />Publicar experiencia</button>
          </section>}
        </article>}
      </div>
    ) : <p className="registryEmptyResults">No hay entradas en esta cola.</p>}

    <Modal open={Boolean(pendingAction)} onClose={() => setPendingAction(null)} title={pendingAction?.title || "Confirmar acción"} className="stateActionModal">
      <div className="stateActionModalContent">
        <CheckCircle2 size={34} />
        <h2>{pendingAction?.title}</h2>
        <p>{pendingAction?.description}</p>
        <div className="stateActionModalButtons">
          <button type="button" className="reportBack" onClick={() => setPendingAction(null)}>Cancelar</button>
          <button type="button" className="reportContinue" onClick={() => void confirmPendingAction()}>Aceptar</button>
        </div>
      </div>
    </Modal>
  </section>;
}
