"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, FilePenLine, MessageSquare, RefreshCw } from "lucide-react";

type RequestEvent = { public_title: string; public_description: string; created_at: string };
type RequestItem = { id: string; facility_name: string | null; current_status: string; report_payload: Record<string, unknown>; created_at: string; events: RequestEvent[] };

const CHANGE_LABELS: Record<string, string> = { name: "Nombre", address: "Dirección", description: "Descripción", phones: "Teléfonos", emails: "Correos", monthlyPriceFromUyu: "Precio mensual" };
const STATUS_LABELS: Record<string, string> = { received: "Enviada", in_review: "En revisión", contact: "Se necesita información", resolved: "Resuelta", closed: "Cerrada" };

function textValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatChangeValue(key: string, value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "Se solicitó retirar todos los valores";
  const text = textValue(value);
  if (!text) return "Actualización solicitada";
  if (key === "monthlyPriceFromUyu") { const amount = Number(text); return Number.isFinite(amount) ? `$ ${amount.toLocaleString("es-UY")}` : text; }
  return text;
}
function requestSummary(report: RequestItem) {
  const rawChanges = report.report_payload.changes;
  const changes = rawChanges && typeof rawChanges === "object" && !Array.isArray(rawChanges) ? Object.entries(rawChanges as Record<string, unknown>).map(([key, value]) => ({ label: CHANGE_LABELS[key] || key, value: formatChangeValue(key, value) })) : [];
  const photoCount = Number(report.report_payload.photoCount || 0);
  if (photoCount > 0) changes.push({ label: "Fotos nuevas", value: `${photoCount} ${photoCount === 1 ? "foto propuesta" : "fotos propuestas"}` });
  return changes;
}

export function FacilityRequestHistory() {
  const [reports, setReports] = useState<RequestItem[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const response = await fetch("/api/institutional/facility/requests", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || "No se pudo cargar.");
    else { setReports(result.reports || []); setMessage(""); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function respond(reportId: string) {
    const response = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "respond", reportId, responseNote: responses[reportId] || "" }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "No se pudo responder."); return; }
    setResponses((current) => ({ ...current, [reportId]: "" }));
    await load();
  }
  return <section className="institutionalWorkspace">
    <header className="institutionalPageHeader"><div><h1>Solicitudes de cambio</h1><p>Consultá el estado de los cambios que enviaste para tus ELEPEM.</p></div><button className="reportBack" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} aria-hidden="true" />{loading ? "Actualizando…" : "Actualizar"}</button></header>
    {message && <p className="reportFieldError" role="alert">{message}</p>}
    <div className="institutionalInboxList" aria-live="polite">{reports.map((report) => {
      const changes = requestSummary(report);
      return <article className="institutionalInboxCard facilityRequestCard" key={report.id}>
        <header><div><p className="facilityRequestEyebrow"><CalendarDays size={15} aria-hidden="true" />Enviada el {formatDate(report.created_at)}</p><h2>{report.facility_name || "Mi ELEPEM"}</h2></div><span className={`facilityRequestStatus is-${report.current_status}`}><CheckCircle2 size={16} aria-hidden="true" />{STATUS_LABELS[report.current_status] || "En proceso"}</span></header>
        <section className="facilityRequestChanges" aria-label="Cambios solicitados"><div className="facilityRequestSectionTitle"><FilePenLine size={18} aria-hidden="true" /><h3>Cambios solicitados</h3></div>{changes.length > 0 ? <dl>{changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd>{change.value}</dd></div>)}</dl> : <p>No se indicaron cambios de datos. La solicitud se envió para revisión.</p>}</section>
        <section className="facilityRequestTimeline" aria-label="Historial de la solicitud"><div className="facilityRequestSectionTitle"><Clock3 size={18} aria-hidden="true" /><h3>Historial</h3></div><ol>{report.events.map((event, index) => <li key={`${event.created_at}-${index}`}><span className="facilityRequestTimelineMarker" aria-hidden="true" /><div><strong>{event.public_title}</strong><p>{event.public_description}</p><time dateTime={event.created_at}>{formatDate(event.created_at)}</time></div></li>)}</ol></section>
        {report.current_status === "contact" && <div className="facilityResponseBox"><div className="facilityRequestSectionTitle"><MessageSquare size={18} aria-hidden="true" /><h3>Responder la solicitud de información</h3></div><label className="reportField"><span>Tu respuesta</span><textarea value={responses[report.id] || ""} onChange={(event) => setResponses((current) => ({ ...current, [report.id]: event.target.value }))} /></label><button type="button" className="reportContinue" disabled={(responses[report.id] || "").trim().length < 3} onClick={() => void respond(report.id)}>Enviar respuesta</button></div>}
      </article>;
    })}{!loading && reports.length === 0 && <p className="registryEmptyResults">Todavía no hay solicitudes.</p>}</div>
  </section>;
}
