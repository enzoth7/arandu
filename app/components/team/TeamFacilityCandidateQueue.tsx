"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  History,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { mapPrivateCandidatesToFacilities } from "../../../lib/private-candidate-map.mjs";
import "./TeamFacilityCandidateQueue.css";

const StreetMap = dynamic(() => import("../StreetMap"), {
  ssr: false,
  loading: () => <div className="candidateMapLoading">Preparando mapa de candidatos…</div>,
});

type CandidateSource = {
  sourceType: string;
  sourceRecordKey: string;
  sourceUrl: string;
  retrievedAt: string;
  sourceDate: string | null;
  sourceLicense: string | null;
  evidenceRole: string;
};

type MatchSuggestion = {
  rank: number;
  score: number | string;
  components: Record<string, unknown>;
  generatedAt: string;
  residencialId: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
};

type ReviewEvent = {
  id: string;
  action: string;
  previous_status: string;
  new_status: string;
  previous_evidence_tier: string;
  new_evidence_tier: string;
  reviewer_identifier: string;
  review_note: string;
  corrections: Record<string, unknown>;
  created_at: string;
};

type FacilityCandidate = {
  id: string;
  candidate_key: string;
  status: string;
  name: string;
  department: string | null;
  locality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  evidence_tier: "A" | "B" | "C";
  human_reviewed: boolean;
  public_eligible: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  sources: CandidateSource[];
  suggestions: MatchSuggestion[];
  review_events: ReviewEvent[];
};

type QueueResponse = {
  candidates?: FacilityCandidate[];
  reviewer?: string;
  error?: string;
};

const STATUS_LABELS: Record<string, string> = {
  discovered: "Descubierto",
  possible_match: "Posible coincidencia",
  needs_review: "Necesita revisión",
  verified_new: "Nuevo verificado",
  verified_match: "Coincidencia verificada",
  duplicate: "Duplicado",
  rejected: "Rechazado",
  closed: "Cerrado",
};

const ACTION_OPTIONS = [
  ["needs_more_evidence", "Necesita más evidencia"],
  ["verified_new", "Verificar nuevo establecimiento"],
  ["verified_match", "Verificar coincidencia existente"],
  ["duplicate", "Marcar como duplicado"],
  ["rejected", "Rechazar"],
  ["closed", "Cerrar"],
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : value;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function explanation(components: Record<string, unknown>) {
  const parts = [];
  if (components.exactNormalizedPhone === true) parts.push("teléfono exacto");
  if (components.departmentMatch === true) parts.push("mismo departamento");
  if (components.departmentConflict === true) parts.push("conflicto de departamento");
  if (components.doorNumberMatch === true) parts.push("misma puerta");
  if (components.doorNumberConflict === true) parts.push("puerta diferente");
  if (typeof components.streetSimilarity === "number") {
    parts.push(`calle ${Math.round(components.streetSimilarity * 100)}%`);
  }
  if (typeof components.nameSimilarity === "number") {
    parts.push(`nombre ${Math.round(components.nameSimilarity * 100)}%`);
  }
  if (typeof components.geographicDistanceMeters === "number") {
    parts.push(`${Math.round(components.geographicDistanceMeters)} m`);
  }
  return parts.length ? parts.join(" · ") : "Sin señales suficientes";
}

export function TeamFacilityCandidateQueue({ viewFilter, hideMap = false, embedded = false }: { viewFilter?: ReactNode; hideMap?: boolean; embedded?: boolean } = {}) {
  const [candidates, setCandidates] = useState<FacilityCandidate[]>([]);
  const [reviewer, setReviewer] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [department, setDepartment] = useState("");
  const [locality, setLocality] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [evidenceTierFilter, setEvidenceTierFilter] = useState("");
  const [action, setAction] = useState("needs_more_evidence");
  const [evidenceTier, setEvidenceTier] = useState<"A" | "B" | "C">("C");
  const [matchedResidencialId, setMatchedResidencialId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [correctedName, setCorrectedName] = useState("");
  const [correctedAddress, setCorrectedAddress] = useState("");
  const [correctedLatitude, setCorrectedLatitude] = useState("");
  const [correctedLongitude, setCorrectedLongitude] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team/facility-candidates", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as QueueResponse;
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la cola.");
      const rows = Array.isArray(data.candidates) ? data.candidates : [];
      setCandidates(rows);
      setReviewer(data.reviewer || "");
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la cola.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const departments = useMemo(() => unique(candidates.map((candidate) => candidate.department)), [candidates]);
  const localities = useMemo(() => unique(candidates.map((candidate) => candidate.locality)), [candidates]);
  const sources = useMemo(
    () => unique(candidates.flatMap((candidate) => candidate.sources.map((item) => item.sourceType))),
    [candidates],
  );
  const filtered = useMemo(() => candidates.filter((candidate) =>
    (!department || candidate.department === department) &&
    (!locality || candidate.locality === locality) &&
    (!source || candidate.sources.some((item) => item.sourceType === source)) &&
    (!status || candidate.status === status) &&
    (!evidenceTierFilter || candidate.evidence_tier === evidenceTierFilter)
  ), [candidates, department, locality, source, status, evidenceTierFilter]);
  const selected = candidates.find((candidate) => candidate.id === selectedId) || null;
  const mappedCandidates = useMemo(
    () => mapPrivateCandidatesToFacilities(filtered),
    [filtered],
  );
  const selectCandidate = useCallback((candidateId: string) => {
    setSelectedId(candidateId);
    setMapSelectedId(`candidate:${candidateId}`);
  }, []);
  const selectMapCandidate = useCallback((facilityId: string) => {
    const candidateId = facilityId.startsWith("candidate:") ? facilityId.slice("candidate:".length) : facilityId;
    setSelectedId(candidateId);
    setMapSelectedId(`candidate:${candidateId}`);
  }, []);

  useEffect(() => {
    setMapSelectedId(null);
  }, [department, locality, source, status, evidenceTierFilter]);

  useEffect(() => {
    if (!selected) return;
    setAction("needs_more_evidence");
    setEvidenceTier(selected.evidence_tier);
    setMatchedResidencialId(selected.suggestions[0]?.residencialId || "");
    setReviewNote("");
    setCorrectedName(selected.name || "");
    setCorrectedAddress(selected.address || "");
    setCorrectedLatitude(selected.latitude === null ? "" : String(selected.latitude));
    setCorrectedLongitude(selected.longitude === null ? "" : String(selected.longitude));
    setSuccess("");
  // Sólo debe reaccionar al cambio de selección. `selected` se recalcula con
  // .find() en cada render, así que incluirlo reiniciaría el formulario y
  // borraría lo que la persona esté escribiendo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const corrections: Record<string, unknown> = {};
    if (correctedName.trim() !== (selected.name || "")) corrections.name = correctedName.trim();
    if (correctedAddress.trim() !== (selected.address || "")) corrections.address = correctedAddress.trim();
    const currentLatitude = selected.latitude === null ? "" : String(selected.latitude);
    const currentLongitude = selected.longitude === null ? "" : String(selected.longitude);
    if (correctedLatitude !== currentLatitude || correctedLongitude !== currentLongitude) {
      corrections.latitude = correctedLatitude;
      corrections.longitude = correctedLongitude;
    }
    try {
      const response = await fetch("/api/team/facility-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selected.id,
          action,
          evidenceTier,
          matchedResidencialId:
            action === "verified_match" || action === "duplicate" ? matchedResidencialId : null,
          reviewNote,
          corrections,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la revisión.");
      setSuccess("Revisión guardada con auditoría. El mapa público no fue modificado.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la revisión.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="candidateQueue" aria-label="Cola privada de candidatos">
    <header className={`candidateQueueHeader ${embedded ? "candidateQueueEmbeddedHeader" : ""}`}>
      <div>
        {!embedded && <div className="eyebrow">Acceso interno · evidencia y revisión humana</div>}
        {embedded ? <h2>Revisión de residenciales</h2> : <h1>Cola de verificación de residenciales</h1>}
        <p>{embedded ? "Seleccioná un registro para revisar sus fuentes y guardar una decisión." : "Estos registros aparecen como capa roja del piloto en el mapa de Personas cuando hay sesión de equipo. Una pista C necesita corroboración antes de verificarse."}</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={17} className={loading ? "candidateSpin" : ""}/> Actualizar
      </button>
    </header>

    {!embedded && <div className="candidateQueueGuard"><ShieldCheck size={21}/><span><strong>Revisión protegida.</strong> Revisor: {reviewer || "sesión de equipo"}. La capa piloto no copia datos a <code>public.residenciales</code>.</span></div>}

    <div className="candidateFilters">
      {viewFilter}
      <label>Departamento<select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departments.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Localidad<select value={locality} onChange={(event) => setLocality(event.target.value)}><option value="">Todas</option>{localities.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Fuente<select value={source} onChange={(event) => setSource(event.target.value)}><option value="">Todas</option>{sources.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Evidencia<select value={evidenceTierFilter} onChange={(event) => setEvidenceTierFilter(event.target.value)}><option value="">Todas</option><option>A</option><option>B</option><option>C</option></select></label>
    </div>

    {error && <div className="candidateMessage candidateError"><AlertTriangle size={18}/>{error}</div>}
    {success && <div className="candidateMessage candidateSuccess"><CheckCircle2 size={18}/>{success}</div>}
    {loading ? <div className="candidateLoading"><LoaderCircle className="candidateSpin"/> Cargando cola privada…</div> :
      <>
      {!hideMap && <section className="candidateMapPanel" aria-label="Mapa de candidatos OSM del piloto">
        <header>
          <div><strong>Mapa del descubrimiento OSM</strong><span>{mappedCandidates.length} candidatos visibles con los filtros actuales</span></div>
          <span className="candidateMapLegend"><i/> Evidencia C · pendiente de revisión</span>
        </header>
        {mappedCandidates.length ? <StreetMap
          facilities={mappedCandidates}
          selectedId={mapSelectedId}
          onSelect={selectMapCandidate}
        /> : <div className="candidateEmpty">No hay candidatos con coordenadas para estos filtros.</div>}
      </section>}
      <div className="candidateQueueLayout">
        <aside className="candidateListPanel">
          <header><span>{filtered.length} candidatos</span><strong>Revisión pendiente</strong></header>
          <div className="candidateList">
            {filtered.map((candidate) => <button type="button" key={candidate.id} className={selectedId === candidate.id ? "isSelected" : ""} onClick={() => selectCandidate(candidate.id)}>
              <span className={`candidateTier tier${candidate.evidence_tier}`}>{candidate.evidence_tier}</span>
              <strong>{candidate.name}</strong>
              <small>{candidate.address || "Sin dirección"}</small>
              <em>{STATUS_LABELS[candidate.status] || candidate.status}</em>
            </button>)}
            {!filtered.length && <div className="candidateEmpty">No hay candidatos con estos filtros.</div>}
          </div>
        </aside>

        {selected ? <article className="candidateDetail">
          <header className="candidateDetailHeader"><div><span>{selected.candidate_key}</span><h2>{selected.name}</h2><p>{selected.address || "Sin dirección"} · {selected.locality || "Sin localidad"} · {selected.department || "Sin departamento"}</p></div><span className={`candidateStatus status-${selected.status}`}>{STATUS_LABELS[selected.status] || selected.status}</span></header>
          <div className="candidateFacts">
            <div><strong>Coordenadas</strong><span>{selected.latitude ?? "—"}, {selected.longitude ?? "—"}</span></div>
            <div><strong>Evidencia</strong><span>Nivel {selected.evidence_tier}</span></div>
            <div><strong>Revisado</strong><span>{selected.human_reviewed ? `Sí · ${selected.reviewed_by || "equipo"}` : "No"}</span></div>
            <div><strong>Elegible público</strong><span>{selected.public_eligible ? "Sí" : "No"}</span></div>
          </div>

          <section className="candidateSources"><h3><FileSearch size={18}/> Fuentes observadas</h3>{selected.sources.map((item) => {
            const url = safeUrl(item.sourceUrl);
            return <div key={`${item.sourceType}-${item.sourceRecordKey}`}><span><strong>{item.sourceType}</strong><small>Consultada: {formatDate(item.retrievedAt)} · {item.sourceLicense || "Licencia no indicada"}</small></span>{url && <a href={url} target="_blank" rel="noopener noreferrer">Abrir fuente <ExternalLink size={14}/></a>}</div>;
          })}</section>

          <section className="candidateMatches"><h3><MapPin size={18}/> Tres coincidencias sugeridas</h3>{selected.suggestions.map((match) => <article key={match.rank}><span className="candidateMatchRank">#{match.rank}</span><div><strong>{match.name}</strong><p>{match.address} · {match.locality}, {match.department}</p><small>{explanation(match.components)}</small></div><b>{Math.round(Number(match.score) * 100)}%</b></article>)}{!selected.suggestions.length && <p>Este candidato todavía no tiene sugerencias sincronizadas.</p>}</section>

          <form className="candidateReviewForm" onSubmit={submitReview}>
            <header><Save size={18}/><div><strong>Registrar revisión</strong><small>La observación original no se modifica.</small></div></header>
            <div className="candidateReviewGrid">
              <label>Decisión<select value={action} onChange={(event) => setAction(event.target.value)}>{ACTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Nivel de evidencia<select value={evidenceTier} onChange={(event) => setEvidenceTier(event.target.value as "A" | "B" | "C")}><option>A</option><option>B</option><option>C</option></select></label>
              {(action === "verified_match" || action === "duplicate") && <label className="candidateReviewWide">Registro existente<select value={matchedResidencialId} onChange={(event) => setMatchedResidencialId(event.target.value)}><option value="">Seleccionar…</option>{selected.suggestions.map((match) => <option key={match.residencialId} value={match.residencialId}>{match.residencialId} · {match.name}</option>)}</select></label>}
              <label>Nombre corregido<input value={correctedName} onChange={(event) => setCorrectedName(event.target.value)} maxLength={300}/></label>
              <label>Dirección corregida<input value={correctedAddress} onChange={(event) => setCorrectedAddress(event.target.value)} maxLength={500}/></label>
              <label>Latitud<input inputMode="decimal" value={correctedLatitude} onChange={(event) => setCorrectedLatitude(event.target.value)}/></label>
              <label>Longitud<input inputMode="decimal" value={correctedLongitude} onChange={(event) => setCorrectedLongitude(event.target.value)}/></label>
              <label className="candidateReviewWide">Nota de revisión<textarea required minLength={3} maxLength={2000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Explicá la evidencia y la decisión…"/></label>
            </div>
            <footer><span>Las verificaciones A/B exigen fuentes enlazadas que las sostengan.</span><button type="submit" disabled={saving}>{saving ? <LoaderCircle size={17} className="candidateSpin"/> : <Save size={17}/>} Guardar revisión</button></footer>
          </form>

          <section className="candidateHistory"><h3><History size={18}/> Historial de auditoría</h3>{selected.review_events.map((event) => <article key={event.id}><span></span><div><strong>{event.reviewer_identifier} · {event.action}</strong><small>{formatDate(event.created_at)} · {event.previous_status} → {event.new_status} · evidencia {event.previous_evidence_tier} → {event.new_evidence_tier}</small><p>{event.review_note}</p></div></article>)}{!selected.review_events.length && <p>Sin decisiones registradas todavía.</p>}</section>
        </article> : <div className="candidateEmpty candidateDetailEmpty">Seleccioná un candidato.</div>}
      </div>
      </>}
  </section>;
}
