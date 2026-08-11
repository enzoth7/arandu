"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type RequestItem = { id: string; case_code: string; demo_facility_id: string; facility_name: string | null; current_status: string; report_payload: Record<string, unknown>; created_at: string; events: Array<{ public_title: string; public_description: string; event_data: Record<string, unknown>; actor: string; created_at: string }> };

export function FacilityRequestHistory() {
  const [reports, setReports] = useState<RequestItem[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/institutional/facility/requests", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "No se pudo cargar."); return; }
    setReports(result.reports || []);
  }
  useEffect(() => { void load(); }, []);

  async function respond(reportId: string) {
    const response = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "respond", reportId, responseNote: responses[reportId] || "" }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "No se pudo responder."); return; }
    setResponses((current) => ({ ...current, [reportId]: "" }));
    await load();
  }

  return <section className="institutionalWorkspace"><header className="institutionalPageHeader"><div><h1>Solicitudes de cambio</h1><p>Las respuestas y decisiones quedan registradas en el historial.</p></div><button className="reportBack" type="button" onClick={() => void load()}><RefreshCw size={17} />Actualizar</button></header>{message && <p className="reportFieldError" role="alert">{message}</p>}<div className="institutionalInboxList">{reports.map((report) => <article className="institutionalInboxCard" key={report.id}><header><div><small>{report.case_code}</small><h2>{report.facility_name || report.demo_facility_id}</h2></div><span className="sourceBadge sourceBadge-gray">{report.current_status}</span></header><pre>{JSON.stringify(report.report_payload.changes || {}, null, 2)}</pre><ol>{report.events.map((event, index) => <li key={`${event.created_at}-${index}`}><strong>{event.public_title}</strong><span>{event.public_description}</span><small>{new Date(event.created_at).toLocaleString("es-UY")} · {event.actor}</small>{event.event_data?.preview ? <pre>{JSON.stringify(event.event_data.preview, null, 2)}</pre> : null}</li>)}</ol>{report.current_status === "contact" && <div className="facilityResponseBox"><label className="reportField"><span>Responder el pedido de información</span><textarea value={responses[report.id] || ""} onChange={(event) => setResponses((current) => ({ ...current, [report.id]: event.target.value }))} /></label><button type="button" className="reportContinue" disabled={(responses[report.id] || "").trim().length < 3} onClick={() => void respond(report.id)}>Enviar respuesta</button></div>}</article>)}{reports.length === 0 && <p className="registryEmptyResults">Todavía no hay solicitudes.</p>}</div></section>;
}
