"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import type { IntakeKind } from "../../../lib/institutional-types";

type InboxReport = {
  id: string;
  case_code: string;
  entry_type: IntakeKind;
  current_status: string;
  priority: string;
  demo_facility_id: string | null;
  report_payload: Record<string, unknown>;
  created_at: string;
  contacts: Array<{ name?: string; phone?: string; email?: string }>;
  events: Array<{ public_title: string; public_description: string; event_data: Record<string, unknown>; created_at: string }>;
  attachments: Array<{ id: string; file_name: string; purpose: string }>;
};

const TABS: Array<[IntakeKind, string]> = [["concern", "Preocupaciones"], ["experience", "Experiencias"], ["facility_change", "Solicitudes de cambio"]];
const ACTIONS: Record<IntakeKind, Array<[string, string]>> = {
  concern: [["review", "Revisar"], ["contact", "Registrar contacto/actuación"], ["refer", "Derivar"], ["resolve", "Resolver"]],
  experience: [["moderate", "Moderar"], ["reclassify_sensitive", "Tratar como preocupación sensible"], ["accept_aggregate", "Aceptar para agregado"], ["private_facility", "Preparar envío privado"], ["anonymize_preview", "Previsualizar anonimizada"]],
  facility_change: [["request_info", "Pedir información"], ["reject", "Rechazar"], ["approve_preview", "Aprobar vista previa"]],
};

function reportSummary(report: InboxReport) {
  const payload = report.report_payload;
  if (report.entry_type === "experience") return String(payload.narrative || `Experiencia estructurada sobre ${report.demo_facility_id || "ELEPEM demo"}`);
  if (report.entry_type === "facility_change") return String(payload.evidenceNote || "Solicitud de actualización de ficha demo");
  return String(payload.narrative || "Preocupación sin relato adicional");
}

export function StateInbox() {
  const [tab, setTab] = useState<IntakeKind>("concern");
  const [reports, setReports] = useState<InboxReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/institutional/state/inbox", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar.");
      setReports(result.reports || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => reports.filter((report) => report.entry_type === tab), [reports, tab]);

  async function decide(report: InboxReport, action: string) {
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
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "No se pudo guardar.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="institutionalWorkspace">
    <header className="institutionalPageHeader">
      <div><span className="demoPermanentBadge">Bandeja demo aislada</span><h1>Revisión estatal</h1><p>Sólo muestra filas con <code>is_demo=true</code>. Ninguna decisión escribe en el padrón público.</p></div>
      <button type="button" className="reportBack" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />Actualizar</button>
    </header>
    <div className="institutionalTabs" role="tablist" aria-label="Colas de revisión">{TABS.map(([kind, label]) => <button key={kind} role="tab" aria-selected={tab === kind} className={tab === kind ? "active" : ""} onClick={() => setTab(kind)}>{label}<span>{reports.filter((report) => report.entry_type === kind).length}</span></button>)}</div>
    {error && <p className="reportFieldError" role="alert"><ShieldAlert size={17} />{error}</p>}
    {loading ? <p role="status">Cargando bandeja…</p> : <div className="institutionalInboxList">
      {visible.map((report) => <article className="institutionalInboxCard" key={report.id}>
        <header><div><small>{report.case_code} · {new Date(report.created_at).toLocaleString("es-UY")}</small><h2>{report.demo_facility_id || "Sin ELEPEM demo asignado"}</h2></div><span className="sourceBadge sourceBadge-gray">{report.current_status}</span></header>
        <p>{reportSummary(report)}</p>
        {report.contacts.length > 0 && <p><strong>Contacto privado:</strong> {[report.contacts[0]?.name, report.contacts[0]?.phone, report.contacts[0]?.email].filter(Boolean).join(" · ")}</p>}
        {report.attachments.length > 0 && <p><strong>Adjuntos privados:</strong> {report.attachments.map((attachment) => `${attachment.file_name} (${attachment.purpose || "evidence"})`).join(", ")}</p>}
        <details><summary>Historial append-only ({report.events.length})</summary><ol>{report.events.map((event, index) => <li key={`${event.created_at}-${index}`}><strong>{event.public_title}</strong><span>{event.public_description}</span><small>{new Date(event.created_at).toLocaleString("es-UY")}</small>{event.event_data?.preview ? <pre>{JSON.stringify(event.event_data.preview, null, 2)}</pre> : null}</li>)}</ol></details>
        <label className="reportField"><span>Nota interna / actuación</span><textarea value={note[report.id] || ""} onChange={(event) => setNote((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={4000} /></label>
        <div className="institutionalCardActions">{ACTIONS[report.entry_type].map(([action, label]) => <button type="button" className="reportBack" key={action} disabled={busyId === report.id} onClick={() => void decide(report, action)}>{action.includes("approve") || action.includes("accept") ? <CheckCircle2 size={16} /> : null}{label}</button>)}</div>
      </article>)}
      {visible.length === 0 && <p className="registryEmptyResults">No hay entradas demo en esta cola.</p>}
    </div>}
  </section>;
}
