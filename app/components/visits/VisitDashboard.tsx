"use client";

import Link from "next/link";
import { CalendarCheck2, CalendarClock, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { VISIT_STATUS_LABELS, type VisitStatus } from "../../../lib/visit-scheduling.mjs";

type Visit = {
  id: string; facilityId: number; facilityKey: string; facilityName: string; facilityLocality: string; facilityDepartment: string;
  requesterUserId: string; status: VisitStatus; preferredStartAt: string; proposedStartAt: string | null; confirmedStartAt: string | null;
  contactName: string; contactEmail: string | null; contactPhone: string | null; partySize: number; practicalNote: string | null;
  facilityNote: string | null; experienceReportId: string | null; createdAt: string; updatedAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "Sin horario";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(value));
}
function montevideoIso(value: string) {
  const parsed = new Date(`${value}:00-03:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

const SPACE_OPTIONS = [["bedrooms","Dormitorios"],["bathrooms","Baños"],["dining_room","Comedor"],["common_areas","Espacios comunes"],["outdoor","Patio o exterior"],["could_not_tour","No pude recorrer"]] as const;
const TOPIC_OPTIONS = [["visits_calls","Visitas y llamadas"],["food_activities","Alimentación y actividades"],["outings_daily_life","Salidas y vida diaria"],["team_direction","Equipo y dirección técnica"],["no_information","No recibí información"]] as const;
const COST_OPTIONS = [["monthly_price","Precio mensual"],["included","Qué incluye"],["extras","Costos extra"],["price_changes","Cambios de precio"],["written_contract","Contrato escrito"],["no_information","No recibí información"]] as const;

function VisitExperienceForm({ visit, onSaved }: { visit: Visit; onSaved: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/visits/${visit.id}/experience`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      spaces: data.getAll("spaces"), questionsAnswered: data.get("questionsAnswered"), topics: data.getAll("topics"),
      costInformation: data.getAll("costInformation"), usefulInformation: data.get("usefulInformation"),
      missingInformation: data.get("missingInformation"), firstHandConfirmed: data.get("firstHandConfirmed") === "on",
      noPersonalDataConfirmed: data.get("noPersonalDataConfirmed") === "on", publicationConsent: data.get("publicationConsent") === "on",
    }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.error || "No se pudo guardar la experiencia."); setBusy(false); return; }
    onSaved();
  }
  const checks = (name: string, options: readonly (readonly [string,string])[]) => <div className="visitChoiceGrid">{options.map(([value,label]) => <label className="reportCheckbox" key={value}><input type="checkbox" name={name} value={value} /><span>{label}</span></label>)}</div>;
  return <form className="visitExperienceForm" onSubmit={submit}>
    <h3>Experiencia de visita</h3><p>Contá únicamente lo que conociste durante esta visita.</p>
    <fieldset><legend>¿Qué espacios pudiste conocer? *</legend>{checks("spaces", SPACE_OPTIONS)}</fieldset>
    <fieldset><legend>¿Respondieron tus preguntas? *</legend><div className="visitChoiceGrid">{[["all","Todas"],["some","Algunas"],["none","Ninguna"],["no_questions","No hice preguntas"]].map(([value,label]) => <label className="reportCheckbox" key={value}><input type="radio" name="questionsAnswered" value={value} required /><span>{label}</span></label>)}</div></fieldset>
    <fieldset><legend>¿Sobre qué temas recibiste información? *</legend>{checks("topics", TOPIC_OPTIONS)}</fieldset>
    <fieldset><legend>¿Qué información económica recibiste? *</legend>{checks("costInformation", COST_OPTIONS)}</fieldset>
    <label className="reportField"><span>¿Qué te resultó útil?</span><textarea name="usefulInformation" maxLength={1000} /></label>
    <label className="reportField"><span>¿Qué te faltó conocer?</span><textarea name="missingInformation" maxLength={1000} /></label>
    <label className="reportCheckbox"><input type="checkbox" name="firstHandConfirmed" required /><span>La información corresponde a esta visita.</span></label>
    <label className="reportCheckbox"><input type="checkbox" name="noPersonalDataConfirmed" required /><span>No incluí nombres de residentes, diagnósticos ni otros datos personales.</span></label>
    <label className="reportCheckbox"><input type="checkbox" name="publicationConsent" /><span>Autorizo que Arandú prepare una versión anonimizada para publicar.</span></label>
    {error && <p className="reportFieldError" role="alert">{error}</p>}
    <button className="reportContinue" type="submit" disabled={busy}>{busy ? "Guardando…" : "Enviar experiencia"}</button>
  </form>;
}

export function VisitDashboard({ mode }: { mode: "visitor" | "facility" }) {
  const endpoint = mode === "visitor" ? "/api/visits" : "/api/institutional/facility/visits";
  const [visits, setVisits] = useState<Visit[]>([]); const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(""); const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  const [times, setTimes] = useState<Record<string,string>>({}); const [notes, setNotes] = useState<Record<string,string>>({});
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch(endpoint, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo cargar."); setVisits(Array.isArray(result.visits) ? result.visits : []); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar."); } finally { setLoading(false); } }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  async function act(visit: Visit, action: string, startAt?: string) {
    setBusyId(visit.id); setError(""); setFeedback("");
    const url = mode === "visitor" ? `/api/visits/${visit.id}` : `/api/visits/${visit.id}/facility-response`;
    const response = await fetch(url, { method: mode === "visitor" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(startAt ? { [mode === "visitor" ? "preferredStartAt" : "startAt"]: startAt } : {}), facilityNote: notes[visit.id] || "" }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) setError(result?.error || "No se pudo actualizar la visita."); else { setFeedback("Visita actualizada."); await load(); }
    setBusyId("");
  }
  return <div className="visitDashboard">
    <header className="institutionalPageHeader"><div><h1>{mode === "visitor" ? "Mis visitas" : "Agenda de visitas"}</h1><p>{mode === "visitor" ? "Consultá solicitudes y horarios confirmados." : "Respondé solicitudes de los ELEPEM que representás."}</p></div><button type="button" className="reportBack" onClick={() => void load()} disabled={loading}><RefreshCw size={17} aria-hidden="true" />Actualizar</button></header>
    {feedback && <p className="stateInboxFeedback" role="status"><CheckCircle2 size={17} aria-hidden="true" />{feedback}</p>}
    {error && <p className="reportFieldError" role="alert">{error}</p>}
    {loading ? <p role="status">Cargando visitas…</p> : visits.length === 0 ? <div className="visitEmpty"><CalendarDaysIcon /><h2>No hay visitas todavía</h2><p>{mode === "visitor" ? "Cuando un ELEPEM tenga agenda activa, podés solicitarla desde su ficha." : "Las solicitudes aparecerán acá cuando la agenda esté habilitada."}</p>{mode === "visitor" && <Link className="reportContinue" href="/">Buscar ELEPEM</Link>}</div> : <div className="visitCards">{visits.map((visit) => {
      const activeTime = visit.confirmedStartAt || visit.proposedStartAt || visit.preferredStartAt;
      return <article className="visitCard" key={visit.id}>
        <header><div><small>{visit.facilityLocality} · {visit.facilityDepartment}</small><h2>{visit.facilityName}</h2></div><span className={`visitStatus visitStatus-${visit.status}`}>{VISIT_STATUS_LABELS[visit.status]}</span></header>
        <p className="visitDate"><CalendarClock size={19} aria-hidden="true" /><span><strong>{visit.confirmedStartAt ? "Horario confirmado" : visit.proposedStartAt ? "Horario propuesto" : "Horario solicitado"}</strong>{formatDate(activeTime)}</span></p>
        {mode === "facility" && <dl className="visitPrivateDetails"><div><dt>Contacto</dt><dd>{[visit.contactName, visit.contactEmail, visit.contactPhone].filter(Boolean).join(" · ")}</dd></div><div><dt>Asistentes</dt><dd>{visit.partySize}</dd></div>{visit.practicalNote && <div><dt>Nota práctica</dt><dd>{visit.practicalNote}</dd></div>}</dl>}
        {visit.facilityNote && <p className="visitFacilityNote"><strong>Mensaje del ELEPEM:</strong> {visit.facilityNote}</p>}
        {mode === "visitor" && <div className="visitActions">
          {visit.status === "horario_propuesto" && <><button className="reportContinue" disabled={busyId === visit.id} onClick={() => void act(visit, "accept_proposal")}>Aceptar horario</button><label className="reportField"><span>Pedir otro horario</span><input type="datetime-local" value={times[visit.id] || ""} onChange={(event) => setTimes((current) => ({ ...current, [visit.id]: event.target.value }))} /></label><button className="reportBack" disabled={!times[visit.id] || busyId === visit.id} onClick={() => void act(visit, "request_alternative", montevideoIso(times[visit.id]))}>Solicitar alternativa</button></>}
          {["solicitada","horario_propuesto","confirmada"].includes(visit.status) && <button className="reportBack visitCancel" disabled={busyId === visit.id} onClick={() => void act(visit, "cancel")}><XCircle size={17} aria-hidden="true" />Cancelar</button>}
        </div>}
        {mode === "facility" && <div className="visitActions">
          {["solicitada","horario_propuesto","confirmada"].includes(visit.status) && <label className="reportField"><span>Mensaje breve (opcional)</span><input maxLength={500} value={notes[visit.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [visit.id]: event.target.value }))} /></label>}
          {visit.status === "solicitada" && <><label className="reportField"><span>Proponer otro horario</span><input type="datetime-local" value={times[visit.id] || ""} onChange={(event) => setTimes((current) => ({ ...current, [visit.id]: event.target.value }))} /></label><button className="reportBack" disabled={!times[visit.id] || busyId === visit.id} onClick={() => void act(visit, "propose", montevideoIso(times[visit.id]))}>Proponer horario</button><button className="reportContinue" disabled={busyId === visit.id} onClick={() => void act(visit, "confirm", visit.preferredStartAt)}>Confirmar horario solicitado</button></>}
          {visit.status === "horario_propuesto" && <button className="reportContinue" disabled={busyId === visit.id || !visit.proposedStartAt} onClick={() => void act(visit, "confirm", visit.proposedStartAt || undefined)}>Confirmar propuesta</button>}
          {visit.status === "confirmada" && <><button className="reportContinue" disabled={busyId === visit.id} onClick={() => void act(visit, "complete")}><CalendarCheck2 size={17} aria-hidden="true" />Marcar realizada</button><button className="reportBack" disabled={busyId === visit.id} onClick={() => void act(visit, "not_completed")}>No realizada</button></>}
          {["solicitada","horario_propuesto","confirmada"].includes(visit.status) && <button className="reportBack visitCancel" disabled={busyId === visit.id} onClick={() => void act(visit, "cancel")}><XCircle size={17} aria-hidden="true" />Cancelar desde el ELEPEM</button>}
        </div>}
        {mode === "visitor" && visit.status === "realizada" && !visit.experienceReportId && <VisitExperienceForm visit={visit} onSaved={() => void load()} />}
        {mode === "visitor" && visit.experienceReportId && <p className="visitExperienceSent"><CheckCircle2 size={18} aria-hidden="true" />Experiencia enviada para revisión.</p>}
      </article>;
    })}</div>}
  </div>;
}

function CalendarDaysIcon() { return <CalendarCheck2 size={36} aria-hidden="true" />; }
