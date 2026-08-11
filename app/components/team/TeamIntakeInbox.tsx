"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, FileText, Filter, History, Inbox, Mail, Paperclip, Phone, PlusCircle, RefreshCw, Save, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Facility } from "../map-types";

type ReportPayload = Record<string, unknown>;
type ReviewKey = "emergency" | "safe" | "duplicate" | "wishes" | "scope";

type IntakeReport = {
  id: string;
  case_code: string;
  priority: string;
  department: string | null;
  report_payload: ReportPayload;
  created_at: string;
  current_status: string;
  updated_at: string;
  events: IntakeEvent[];
  attachments: IntakeAttachment[];
};

type IntakeEvent = {
  id: string;
  status: string;
  public_title: string;
  public_description: string;
  internal_note: string | null;
  event_data: ReportPayload;
  actor: string;
  created_at: string;
};

type IntakeAttachment = {
  id: string;
  object_path?: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type IntakeReview = {
  checks: Record<ReviewKey, boolean>;
  scopeStatus: "pending" | "in_scope" | "out_of_scope";
  urgency: string;
  route: string;
  referral: string;
  note: string;
  saved: boolean;
};

const reviewChecks: [ReviewKey, string, string][] = [
  ["emergency", "Se revisó si existe peligro inmediato", "revisar si existe peligro inmediato"],
  ["safe", "Se registró una forma de contacto seguro", "confirmar una forma de contacto seguro"],
  ["duplicate", "Se buscaron entradas o casos relacionados", "buscar entradas o casos relacionados"],
  ["wishes", "Se registró la voluntad de la persona o la posibilidad de contactarla", "registrar la voluntad de la persona o la posibilidad de contactarla"],
];

const urgencyOptions = ["Alta", "Media", "Baja", "Por evaluar"];
const routeOptions = [
  "Equipo especializado / Inmayores",
  "Salud",
  "Sistema de Cuidados",
  "MSP · ELEPEM",
  "Policía / Fiscalía",
  "Bomberos",
  "Orientación sin apertura de caso",
];
const referralOptions = [
  "Servicio correspondiente por definir",
  "Policía / Fiscalía",
  "Servicio de salud / MSP",
  "MIDES / Inmujeres / Inmayores",
  "Sistema Nacional Integrado de Cuidados",
  "Gobierno departamental / servicio local",
  "Otro organismo",
];

function initialReview(priority: string): IntakeReview {
  return {
    checks: { emergency: false, safe: false, duplicate: false, wishes: false, scope: false },
    scopeStatus: "pending",
    urgency: urgencyOptions.includes(priority) ? priority : "Por evaluar",
    route: "Equipo especializado / Inmayores",
    referral: referralOptions[0],
    note: "",
    saved: false,
  };
}

function reviewFromReport(report: IntakeReport): IntakeReview {
  const base = initialReview(report.priority);
  const latest = [...(Array.isArray(report.events) ? report.events : [])].reverse().find((event) => event.actor === "organization");
  if (!latest) return base;
  const data = record(latest.event_data);
  const storedChecks = record(data.checks);
  const storedScope = typeof data.scopeStatus === "string" ? data.scopeStatus as "pending" | "in_scope" | "out_of_scope" : (storedChecks.scope === true ? "in_scope" : "pending");
  return {
    checks: {
      emergency: storedChecks.emergency === true,
      safe: storedChecks.safe === true,
      duplicate: storedChecks.duplicate === true,
      wishes: storedChecks.wishes === true,
      scope: storedScope === "in_scope",
    },
    scopeStatus: storedScope,
    urgency: value(data, "urgency", base.urgency),
    route: value(data, "route", base.route),
    referral: value(data, "referral", base.referral),
    note: latest.internal_note || "",
    saved: true,
  };
}

function record(value: unknown): ReportPayload {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ReportPayload : {};
}

function value(payload: ReportPayload, key: string, fallback = "No indicado"): string {
  return typeof payload[key] === "string" && (payload[key] as string).trim() ? (payload[key] as string).trim() : fallback;
}

function values(payload: ReportPayload, key: string): string[] {
  return Array.isArray(payload[key]) ? payload[key].filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function reportPlace(report: IntakeReport): string {
  const location = record(report.report_payload.location);
  const facility = record(report.report_payload.facility);
  const facilityName = value(facility, "name", "");
  const reference = value(location, "reference", "");
  return facilityName || reference || report.department || "No indicado";
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function fileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Tamaño no disponible";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(value / 1024)} KB`;
}


function getUrgencyBadgeStyle(urgency: string) {
  const u = urgency.toLowerCase();
  if (u.includes("alta") || u.includes("crítica") || u.includes("critica")) {
    return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
  }
  if (u.includes("media")) {
    return { bg: "#fffbe6", color: "#d97706", border: "#fef08a" };
  }
  if (u.includes("baja")) {
    return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
  }
  return { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
}

type TeamIntakeInboxProps = {
  initialFacility?: Facility | null;
};

export function TeamIntakeInbox({ initialFacility }: TeamIntakeInboxProps = {}) {
  const [activeTab, setActiveTab] = useState<"inbox" | "newEntry">(initialFacility ? "newEntry" : "inbox");
  const [detailTab, setDetailTab] = useState<"info" | "actions">("info");
  const [openEvidence, setOpenEvidence] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [reports, setReports] = useState<IntakeReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem("arandu-read-ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Filtros rápidos
  const [filterStatus, setFilterStatus] = useState<"todos" | "unread" | "reviewed">("todos");
  const [filterUrgency, setFilterUrgency] = useState<"todas" | "Alta" | "Media" | "Baja">("todas");

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("arandu-read-ids", JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<Record<string, IntakeReview>>({});
  const [savingId, setSavingId] = useState("");
  const [saveError, setSaveError] = useState("");

  // Estado del formulario de registro externo
  const [entryChannel, setEntryChannel] = useState("Llamada / Teléfono");
  const [entrySetting, setEntrySetting] = useState(initialFacility ? "En un residencial / ELEPEM" : "En su casa o comunidad");
  const [entryReporter, setEntryReporter] = useState("Familiar o referente");
  const [entryReporterName, setEntryReporterName] = useState("");
  const [entryDepartment, setEntryDepartment] = useState(initialFacility?.department || "Montevideo");
  const [entryReference, setEntryReference] = useState(
    initialFacility ? `${initialFacility.name} — ${initialFacility.address || initialFacility.locality}` : ""
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("arandu-preselected-facility");
      if (raw) {
        const facility = JSON.parse(raw);
        window.sessionStorage.removeItem("arandu-preselected-facility");
        if (facility && typeof facility === "object") {
          setActiveTab("newEntry");
          setEntrySetting("En un residencial / ELEPEM");
          if (facility.department) setEntryDepartment(facility.department);
          if (facility.name) {
            setEntryReference(`${facility.name} — ${facility.address || facility.locality || ""}`);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (initialFacility) {
      setActiveTab("newEntry");
      setEntrySetting("En un residencial / ELEPEM");
      setEntryDepartment(initialFacility.department);
      setEntryReference(`${initialFacility.name} — ${initialFacility.address || initialFacility.locality}`);
    }
  }, [initialFacility]);
  const [entryNarrative, setEntryNarrative] = useState("");
  const [entryUrgency, setEntryUrgency] = useState<"Alta" | "Media" | "Baja">("Media");
  const [entryPrivacy] = useState("Confidencial");
  const [entryPhone, setEntryPhone] = useState("");
  const [entryEmail, setEntryEmail] = useState("");
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryMessage, setEntryMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/team/intake-reports", { cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("reports" in data) || !Array.isArray(data.reports)) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudieron cargar las comunicaciones.";
        throw new Error(message);
      }

      const nextReports = data.reports as IntakeReport[];
      setReports(nextReports);
      setReviews(Object.fromEntries(nextReports.map((report) => [report.id, reviewFromReport(report)])));
      setSelectedId((current) => nextReports.some((report) => report.id === current) ? current : (nextReports[0]?.id || ""));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las comunicaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Filtrado de reportes
  const filteredReports = reports.filter((report) => {
    const isUnread = report.current_status === "received" && !readIds.has(report.id);
    const review = reviews[report.id];
    const isReviewed = report.current_status !== "received" || review?.saved === true;

    if (filterStatus === "unread" && !isUnread) return false;
    if (filterStatus === "reviewed" && !isReviewed) return false;

    if (filterUrgency !== "todas") {
      const currentUrgency = review?.urgency || report.priority;
      if (currentUrgency.toLowerCase() !== filterUrgency.toLowerCase()) return false;
    }

    return true;
  });

  const effectiveSelectedId = filteredReports.some((report) => report.id === selectedId)
    ? selectedId
    : (filteredReports[0]?.id || "");

  const selected = reports.find((report) => report.id === effectiveSelectedId) || null;
  const selectedReview = selected ? reviews[selected.id] || initialReview(selected.priority) : null;
  const selectedIsReviewed = selected ? (selected.current_status !== "received" || reviews[selected.id]?.saved === true) : false;

  useEffect(() => {
    if (selected) {
      setOpenEvidence(Array.isArray(selected.attachments) && selected.attachments.length > 0);
    }
  // Sólo debe reaccionar al cambio de selección. `selected` se recalcula con
  // .find() en cada render, así que incluirlo reiniciaría el formulario y
  // borraría lo que la persona esté escribiendo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const updateReview = (changes: Partial<IntakeReview>) => {
    if (!selected) return;
    setReviews((current) => {
      const existing = current[selected.id] || initialReview(selected.priority);
      return { ...current, [selected.id]: { ...existing, ...changes, saved: false } };
    });
  };

  const updateReviewCheck = (key: ReviewKey, checked: boolean) => {
    if (!selected) return;
    setReviews((current) => {
      const existing = current[selected.id] || initialReview(selected.priority);
      return {
        ...current,
        [selected.id]: {
          ...existing,
          checks: { ...existing.checks, [key]: checked },
          saved: false,
        },
      };
    });
  };

  const saveReview = async () => {
    if (!selected) return;
    const review = reviews[selected.id] || initialReview(selected.priority);
    setSavingId(selected.id);
    setSaveError("");
    try {
      const response = await fetch("/api/team/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selected.id,
          checks: review.checks,
          scopeStatus: review.scopeStatus,
          urgency: review.urgency,
          route: review.route,
          referral: review.referral,
          note: review.note,
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("event" in data) || !data.event || typeof data.event !== "object") {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "No se pudo guardar la revisión.";
        throw new Error(message);
      }
      const event = data.event as IntakeEvent;
      const currentStatus = "currentStatus" in data && typeof data.currentStatus === "string" ? data.currentStatus : event.status;
      setReports((current) => current.map((report) => report.id === selected.id
        ? { ...report, current_status: currentStatus, priority: review.urgency, updated_at: event.created_at, events: [...(report.events || []), event] }
        : report));
      setReviews((current) => ({ ...current, [selected.id]: { ...review, saved: true } }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la revisión.");
    } finally {
      setSavingId("");
    }
  };

  const submitExternalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryReference.trim() || !entryNarrative.trim()) {
      setEntryMessage("Completá la referencia del lugar y el resumen de lo comunicado.");
      return;
    }

    setEntrySubmitting(true);
    setEntryMessage("");
    try {
      const response = await fetch("/api/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            setting: entrySetting,
            reporter: entryReporterName ? `${entryReporter} (${entryReporterName})` : entryReporter,
            channel: entryChannel,
            location: {
              department: entryDepartment,
              reference: entryReference,
            },
            concerns: ["Comunicación ingresada por el equipo"],
            narrative: entryNarrative,
            risks: [entryUrgency],
            privacy: entryPrivacy,
            contactEmail: entryEmail,
            contactPhone: entryPhone,
            contactMethod: entryPhone ? "Llamada" : "Sin contacto",
            safeContact: "",
            noEarlyContact: false,
            preliminaryPriority: entryUrgency,
            suggestedRoute: [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo registrar la comunicación.");
      }

      setEntryNarrative("");
      setEntryReference("");
      setEntryReporterName("");
      setEntryPhone("");
      setEntryEmail("");
      setEntryMessage("");
      setActiveTab("inbox");
      await load();
    } catch (err) {
      setEntryMessage(err instanceof Error ? err.message : "No se pudo registrar la entrada.");
    } finally {
      setEntrySubmitting(false);
    }
  };

  return <section className="teamInbox">
    <header className="teamInboxHeader">
      <div>
        <div className="eyebrow">Gestión institucional</div>
        <h1>Comunicaciones recibidas</h1>
        <p>Revisá entradas web y registrá comunicaciones que llegan por otros canales.</p>
      </div>
      <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
        <button className="teamGhostButton" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={17} className={loading ? "teamInboxSpin" : ""}/> Actualizar
        </button>
      </div>
    </header>

    {/* Pestañas Institucionales con Filtros Rápidos */}
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", marginBottom: "20px", flexWrap: "wrap", gap: "12px"}}>
      <div style={{display: "flex", gap: "12px"}}>
        <button
          type="button"
          onClick={() => setActiveTab("inbox")}
          style={{
            padding: "10px 16px",
            border: "0",
            borderBottom: activeTab === "inbox" ? "3px solid #1768d3" : "3px solid transparent",
            background: "transparent",
            color: activeTab === "inbox" ? "#1768d3" : "#64748b",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Inbox size={18} /> Bandeja de entradas ({filteredReports.length})
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("newEntry")}
          style={{
            padding: "10px 16px",
            border: "0",
            borderBottom: activeTab === "newEntry" ? "3px solid #1768d3" : "3px solid transparent",
            background: "transparent",
            color: activeTab === "newEntry" ? "#1768d3" : "#64748b",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <PlusCircle size={18} /> Registrar entrada por otro canal
        </button>
      </div>

      {activeTab === "inbox" && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "6px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.85rem", fontWeight: 700 }}>
            <Filter size={16} color="#1768d3" /> Filtros:
          </div>
          
          <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>
            <span>Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "todos" | "unread" | "reviewed")}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd9e7", fontSize: "0.85rem", backgroundColor: "#ffffff", color: "#1e293b", cursor: "pointer" }}
            >
              <option value="todos">Todos</option>
              <option value="unread">No leídos</option>
              <option value="reviewed">Revisados</option>
            </select>
          </label>

          <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>
            <span>Urgencia determinada:</span>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value as "todas" | "Alta" | "Media" | "Baja")}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd9e7", fontSize: "0.85rem", backgroundColor: "#ffffff", color: "#1e293b", cursor: "pointer" }}
            >
              <option value="todas">Todas</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </label>
        </div>
      )}
    </div>

    {activeTab === "newEntry" && (
      <div className="card" style={{maxWidth: "780px", margin: "0 auto", padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid #cbd9e7"}}>
        <h2 style={{fontSize: "1.3rem", color: "#1e3a5f", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px"}}>
          <UserPlus size={22} color="#1768d3"/> Registrar comunicación recibida por otro canal
        </h2>
        <p style={{color: "#64748b", fontSize: "0.9rem", marginBottom: "20px"}}>
          Cargá llamadas telefónicas, mensajes de WhatsApp, atenciones presenciales o derivaciones de Policía / Salud para tratarlas en la misma bandeja.
        </p>

        <form onSubmit={submitExternalEntry} style={{display: "grid", gap: "16px"}}>
          <div className="reportFieldGrid">
            <label className="reportField">
              <span>Canal de entrada</span>
              <select value={entryChannel} onChange={(e) => setEntryChannel(e.target.value)}>
                <option>Llamada / Teléfono</option>
                <option>WhatsApp / SMS</option>
                <option>Atención presencial</option>
                <option>Policía / Fiscalía</option>
                <option>Servicio de salud / Emergencia</option>
                <option>Otro organismo</option>
              </select>
            </label>

            <label className="reportField">
              <span>Urgencia inicial</span>
              <select value={entryUrgency} onChange={(e) => setEntryUrgency(e.target.value as "Alta" | "Media" | "Baja")}>
                <option value="Alta">Alta · Peligro o riesgo inminente</option>
                <option value="Media">Media · Atención prioritaria hoy</option>
                <option value="Baja">Baja · Orientación o consulta</option>
              </select>
            </label>
          </div>

          <div className="reportFieldGrid">
            <label className="reportField">
              <span>Ámbito</span>
              <select value={entrySetting} onChange={(e) => setEntrySetting(e.target.value)}>
                <option>En su casa o comunidad</option>
                <option>En un residencial / ELEPEM</option>
                <option>En otro servicio</option>
                <option>No se conoce</option>
              </select>
            </label>

            <label className="reportField">
              <span>Quién comunica</span>
              <select value={entryReporter} onChange={(e) => setEntryReporter(e.target.value)}>
                <option>Familiar o referente</option>
                <option>La propia persona</option>
                <option>Vecino/a o amistad</option>
                <option>Cuidador/a</option>
                <option>Profesional de salud o social</option>
                <option>Oficial de Policía / Autoridad</option>
              </select>
            </label>
          </div>

          <div className="reportFieldGrid">
            <label className="reportField">
              <span>Departamento</span>
              <select value={entryDepartment} onChange={(e) => setEntryDepartment(e.target.value)}>
                {["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"].map((dept) => (
                  <option key={dept}>{dept}</option>
                ))}
              </select>
            </label>

            <label className="reportField">
              <span>Referencia para encontrar el lugar</span>
              <input value={entryReference} onChange={(e) => setEntryReference(e.target.value)} placeholder="Ej.: Av. 18 de Julio 1234, o esquina comercio X" />
            </label>
          </div>

          <label className="reportField">
            <span>Resumen de lo comunicado</span>
            <textarea value={entryNarrative} onChange={(e) => setEntryNarrative(e.target.value)} placeholder="Describí los hechos relatados durante la atención o llamada." />
          </label>

          <div className="reportFieldGrid">
            <label className="reportField">
              <span>Teléfono de contacto <em>opcional</em></span>
              <input type="tel" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} placeholder="Ej.: 099 123 456" />
            </label>
            <label className="reportField">
              <span>Correo electrónico <em>opcional</em></span>
              <input type="email" value={entryEmail} onChange={(e) => setEntryEmail(e.target.value)} placeholder="Ej.: usuario@correo.com" />
            </label>
          </div>

          {entryMessage && <div className="reportValidation" role="alert">{entryMessage}</div>}

          <button type="submit" className="reportContinue" disabled={entrySubmitting} style={{marginTop: "10px"}}>
            {entrySubmitting ? "Registrando…" : "Registrar comunicación en la bandeja"} <ArrowRight size={18}/>
          </button>
        </form>
      </div>
    )}

    {activeTab === "inbox" && <>
      {error && <div className="teamInboxError" role="alert"><AlertTriangle size={20}/><span>{error}</span></div>}
      {loading && <div className="teamInboxLoading">Cargando comunicaciones…</div>}
      {!loading && !error && !reports.length && <div className="teamInboxEmpty"><Inbox size={30}/><strong>Todavía no hay comunicaciones.</strong><span>Cuando una persona complete el formulario o se registre una llamada, aparecerá aquí.</span></div>}
      {!loading && !error && reports.length > 0 && filteredReports.length === 0 && (
        <div className="teamInboxEmpty">
          <Filter size={30} color="#1768d3" />
          <strong>No se encontraron comunicaciones.</strong>
          <span>No hay entradas que coincidan con los filtros de estado y urgencia seleccionados.</span>
        </div>
      )}

      {!loading && !error && filteredReports.length > 0 && <div className="teamInboxLayout">
        <aside className="teamInboxListPanel">
          <div className="teamInboxListHeading">
            <div><span>Bandeja de recepción</span><h2>{filteredReports.length} {filteredReports.length === 1 ? "entrada" : "entradas"}</h2></div>
            <ClipboardCheck size={22}/>
          </div>
          <div className="teamInboxList" aria-label="Comunicaciones recibidas">{filteredReports.map((report) => {
            const payload = record(report.report_payload);
            const isSelected = report.id === effectiveSelectedId;
            const isUnread = report.current_status === "received" && !readIds.has(report.id);
            const review = reviews[report.id];
            const isReviewed = report.current_status !== "received" || review?.saved === true;
            const assignedUrgency = review?.urgency || report.priority;
            const urgencyStyle = getUrgencyBadgeStyle(assignedUrgency);

            return <button
              key={report.id}
              type="button"
              className={`teamInboxItem ${isSelected ? "isSelected" : ""}`}
              onClick={() => { setSelectedId(report.id); markAsRead(report.id); }}
              style={{
                backgroundColor: isUnread ? "#edf5ff" : "#ffffff",
                borderColor: isSelected ? "#1768d3" : (isUnread ? "#cbd9e7" : "#e2e8f0"),
                borderLeft: isReviewed ? `4px solid ${urgencyStyle.color}` : "4px solid transparent",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "12px",
                borderRadius: "8px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", width: "100%" }}>
                <strong style={{ fontSize: "0.92rem", color: "#1e293b" }}>{report.case_code} · {value(payload, "setting")}</strong>
                {isReviewed && (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: urgencyStyle.bg,
                    color: urgencyStyle.color,
                    border: `1px solid ${urgencyStyle.border}`,
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    <AlertTriangle size={12} /> {assignedUrgency}
                  </span>
                )}
              </div>

              <small style={{ color: "#475569", fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {value(payload, "narrative")}
              </small>
              <time style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Recibida {dateTime(report.created_at)}</time>
            </button>;
          })}</div>
        </aside>

        {selected && selectedReview && <article className="teamInboxDetail">
          <div className="teamInboxDetailHeading">
            <div>
              <h2>{selected.case_code}</h2>
              <p>Recibida {dateTime(selected.created_at)}</p>
            </div>
            <CheckCircle2 size={25}/>
          </div>

          {/* Pestañas internas de detalle */}
          <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #cbd9e7", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setDetailTab("info")}
              style={{
                padding: "8px 14px",
                border: "0",
                borderBottom: detailTab === "info" ? "3px solid #1768d3" : "3px solid transparent",
                background: "transparent",
                color: detailTab === "info" ? "#1768d3" : "#64748b",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FileText size={16} /> Información
            </button>
            <button
              type="button"
              onClick={() => setDetailTab("actions")}
              style={{
                padding: "8px 14px",
                border: "0",
                borderBottom: detailTab === "actions" ? "3px solid #1768d3" : "3px solid transparent",
                background: "transparent",
                color: detailTab === "actions" ? "#1768d3" : "#64748b",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={16} /> Acciones
            </button>
          </div>

          {detailTab === "info" && (
            <>
              {/* Distintivo de Urgencia Confirmada por el Equipo */}
              {selectedIsReviewed && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  backgroundColor: getUrgencyBadgeStyle(selectedReview.urgency).bg,
                  border: `1px solid ${getUrgencyBadgeStyle(selectedReview.urgency).border}`,
                  marginBottom: "16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: getUrgencyBadgeStyle(selectedReview.urgency).color, fontWeight: 700, fontSize: "0.9rem" }}>
                    <ShieldCheck size={20} />
                    <span>Urgencia confirmada por el equipo:</span>
                  </div>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    backgroundColor: "#ffffff",
                    color: getUrgencyBadgeStyle(selectedReview.urgency).color,
                    border: `1px solid ${getUrgencyBadgeStyle(selectedReview.urgency).border}`,
                  }}>
                    {selectedReview.urgency}
                  </span>
                </div>
              )}

              <div className="teamInboxFacts">
                <div><strong>Canal de recepción</strong><span>{value(selected.report_payload, "channel", "Formulario web")}</span></div>
                <div><strong>Ámbito</strong><span>{value(selected.report_payload, "setting")}</span></div>
                <div><strong>Quién comunica</strong><span>{value(selected.report_payload, "reporter")}</span></div>
                <div><strong>Lugar</strong><span>{reportPlace(selected)}</span></div>
                <div><strong>Privacidad</strong><span>{value(selected.report_payload, "privacy")}</span></div>
                <div><strong>Contacto seguro</strong><span>{value(selected.report_payload, "safeContact", value(selected.report_payload, "contactMethod"))}</span></div>
                <div><strong>No contactar primero</strong><span>{selected.report_payload.noEarlyContact === true ? "Sí" : "No indicado"}</span></div>
                <div><strong><Phone size={14}/> Celular</strong><span>{value(selected.report_payload, "contactPhone", "No indicado")}</span></div>
                <div><strong><Mail size={14}/> Correo</strong><span>{value(selected.report_payload, "contactEmail", "No indicado")}</span></div>
                <div><strong>Preocupaciones</strong><span>{values(selected.report_payload, "concerns").join(" · ") || "No indicadas"}</span></div>
              </div>

              {/* 1. Resumen de Relato (Sección principal abierta) */}
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd9e7", borderRadius: "12px", padding: "18px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a5f", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={17} color="#1768d3" /> Lo comunicado
                  </h4>
                  <p style={{ color: "#334155", fontSize: "0.92rem", lineHeight: "1.65", margin: 0, whiteSpace: "pre-wrap" }}>
                    {value(selected.report_payload, "narrative")}
                  </p>
                </div>
              </div>

              {/* 2. Acordeón Desplegable: Evidencias adjuntas */}
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd9e7", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenEvidence((prev) => !prev)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    border: "none",
                    borderBottom: openEvidence ? "1px solid #cbd9e7" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Paperclip size={18} color="#1768d3" />
                    <strong style={{ fontSize: "0.95rem", color: "#1e3a5f" }}>Evidencias adjuntas</strong>
                    <span style={{
                      backgroundColor: (selected.attachments?.length || 0) > 0 ? "#edf5ff" : "#e2e8f0",
                      color: (selected.attachments?.length || 0) > 0 ? "#1768d3" : "#64748b",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid #cbd9e7",
                    }}>
                      {selected.attachments?.length || 0}
                    </span>
                  </div>
                  {openEvidence ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </button>

                {openEvidence && (
                  <div style={{ padding: "16px" }}>
                    {selected.attachments?.length ? (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                        {selected.attachments.map((attachment) => {
                          const isAudio = (attachment.mime_type && attachment.mime_type.startsWith("audio/")) || attachment.file_name.endsWith(".webm") || attachment.file_name.endsWith(".mp3") || attachment.file_name.endsWith(".ogg") || attachment.file_name.endsWith(".wav") || attachment.file_name.endsWith(".m4a");
                          const isImage = (attachment.mime_type && attachment.mime_type.startsWith("image/")) ||
                            attachment.file_name.endsWith(".png") ||
                            attachment.file_name.endsWith(".jpg") ||
                            attachment.file_name.endsWith(".jpeg") ||
                            attachment.file_name.endsWith(".webp") ||
                            attachment.file_name.endsWith(".heic");
                          const targetPath = attachment.object_path || attachment.id;
                          const attachmentUrl = `/api/team/intake-reports/attachment?path=${encodeURIComponent(targetPath)}`;
                          return (
                            <li key={attachment.id} style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "space-between" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                                  <FileText size={16} color="#475569" />
                                  <strong style={{ fontSize: "0.88rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.file_name}</strong>
                                  <small style={{ color: "#64748b", fontSize: "0.78rem" }}>({fileSize(Number(attachment.size_bytes))})</small>
                                </span>
                                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#1768d3", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                                  <ExternalLink size={13} /> Abrir / Descargar
                                </a>
                              </div>
                              {isImage && (
                                <div style={{ marginTop: "8px" }}>
                                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- URL de adjunto firmada en tiempo de ejecución; next/image no puede optimizarla */}
                                    <img
                                      src={attachmentUrl}
                                      alt={attachment.file_name}
                                      style={{
                                        maxHeight: "180px",
                                        maxWidth: "100%",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd9e7",
                                        objectFit: "contain",
                                        backgroundColor: "#f1f5f9",
                                        cursor: "pointer",
                                      }}
                                    />
                                  </a>
                                </div>
                              )}
                              {isAudio && (
                                <audio src={attachmentUrl} controls style={{ width: "100%", height: "36px", marginTop: "4px" }} />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0, fontStyle: "italic" }}>No se adjuntaron archivos.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Acordeón Desplegable: Historial de avances */}
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #cbd9e7", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenHistory((prev) => !prev)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    border: "none",
                    borderBottom: openHistory ? "1px solid #cbd9e7" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <History size={18} color="#1768d3" />
                    <strong style={{ fontSize: "0.95rem", color: "#1e3a5f" }}>Historial de avances</strong>
                    <span style={{
                      backgroundColor: "#e2e8f0",
                      color: "#64748b",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}>
                      {selected.events?.length || 0}
                    </span>
                  </div>
                  {openHistory ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </button>

                {openHistory && (
                  <div style={{ padding: "16px" }}>
                    <section className="teamInboxHistory" style={{ margin: 0 }}>
                      <ol style={{ margin: 0, paddingLeft: "16px" }}>
                        {(selected.events || []).map((event) => (
                          <li key={event.id}>
                            <span></span>
                            <div>
                              <strong>{event.public_title}</strong>
                              <small>{event.public_description} · {dateTime(event.created_at)}</small>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  </div>
                )}
              </div>
            </>
          )}

          {detailTab === "actions" && (
            <section className="teamInboxReview">
              <header><span><ShieldCheck size={21}/></span><div><small>Recepción y triage</small><h3>1. Revisar seguridad y alcance</h3></div></header>
              <div className="teamInboxReviewBody">
                <div className="teamInboxChecklist">{reviewChecks.map(([key, label]) =>
                  <label key={key}><input type="checkbox" checked={selectedReview.checks[key]} onChange={(event) => updateReviewCheck(key, event.target.checked)}/><span>{label}</span></label>
                )}</div>

                <div className="teamInboxReviewFields">
                  <label>
                    <span>Nivel de urgencia</span>
                    <select value={selectedReview.urgency} onChange={(event) => updateReview({ urgency: event.target.value })}>
                      {urgencyOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>¿Está dentro del alcance del servicio?</span>
                    <select
                      value={selectedReview.scopeStatus}
                      onChange={(event) => updateReview({ scopeStatus: event.target.value as "pending" | "in_scope" | "out_of_scope" })}
                    >
                      <option value="pending">Pendiente de determinar</option>
                      <option value="in_scope">Sí, está dentro del alcance</option>
                      <option value="out_of_scope">No, requiere orientación o derivación</option>
                    </select>
                  </label>

                  <label>
                    <span>Ruta principal sugerida</span>
                    <select value={selectedReview.route} onChange={(event) => updateReview({ route: event.target.value })}>
                      {routeOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>

                  {selectedReview.scopeStatus === "out_of_scope" && (
                    <label className="teamInboxReferralField">
                      <span>Derivar a <small>· situación fuera del alcance</small></span>
                      <select value={selectedReview.referral} onChange={(event) => updateReview({ referral: event.target.value })}>
                        {referralOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                  )}
                </div>

                <label className="teamInboxTriageNote"><span>Nota de triage</span><textarea value={selectedReview.note} onChange={(event) => updateReview({ note: event.target.value })} placeholder="Distinguir hechos comunicados, información faltante y decisión de recepción."/></label>
                
                <div className="teamInboxReviewActions">
                  <button type="button" disabled={savingId === selected.id} onClick={() => void saveReview()}>
                    <Save size={17}/> {savingId === selected.id ? "Guardando…" : "Guardar revisión"}
                  </button>
                  <span role="status" aria-live="polite">
                    {saveError || (selectedReview.saved ? "Revisión guardada en Supabase; el usuario ya puede ver el avance." : "Los cambios se guardarán en el historial del trámite.")}
                  </span>
                </div>
              </div>
            </section>
          )}
        </article>}
      </div>}
    </>}
  </section>;
}
