"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Trash2, Paperclip } from "lucide-react";
import type { FacilityProfile } from "../../../lib/institutional-types";

type EditableKey = "name" | "address" | "description" | "phones" | "emails" | "monthlyPriceFromUyu";
type Draft = Record<EditableKey, string> & { priceDate: string; priceSourceUrl: string; priceIncludes: string[] };

const SERVICE_CATEGORIES = {
  "Tipo de estadía": ["Estadía permanente", "Estadía temporal", "Estadía de respiro", "Centro de día", "Recuperación o convalecencia", "Rehabilitación"],
  "Habitación y privacidad": ["Habitación individual", "Habitación compartida", "Baño privado", "Baño compartido"],
  "Entorno": ["Jardín, patio o espacio exterior", "Espacios comunes", "Aire acondicionado", "Calefacción", "Iluminación natural"],
  "Accesibilidad y movilidad": ["Acceso sin escalones", "Ascensor o ayuda para escaleras", "Circulación para silla de ruedas", "Baño adaptado", "Barras de apoyo", "Ducha a nivel del piso", "Sistema de llamada en dormitorio o baño", "Camas articuladas o eléctricas"],
  "Cuidados y profesionales": ["Atención o asistencia durante las 24 horas", "Dirección técnica médica", "Médico general", "Médico geriatra", "Enfermería", "Fisioterapia", "Nutricionista", "Psicología", "Trabajo social o asistencia social", "Odontología", "Podología"],
  "Vida cotidiana y vínculos": ["Actividades y recreación", "Paseos y salidas", "Actividad física", "Música, arte o talleres", "Estimulación cognitiva", "Alimentación adaptada", "Menú visible", "Horarios amplios de visita", "Espacio privado para visitas o llamadas", "Acceso a teléfono", "Internet o Wi-Fi"]
};

function draftFor(facility?: FacilityProfile): Draft {
  return { name: facility?.name || "", address: facility?.address || "", description: facility?.description || "", phones: facility?.phones?.[0] || "", emails: facility?.emails?.[0] || "", monthlyPriceFromUyu: facility?.monthlyPriceFromUyu ? String(facility.monthlyPriceFromUyu) : "", priceDate: facility?.priceVerifiedAt || "", priceSourceUrl: facility?.priceSourceUrl || "", priceIncludes: facility?.priceIncludes || [] };
}

export function FacilityChangeForm({ facilities, enabled = true }: { facilities: FacilityProfile[]; enabled?: boolean }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || 0);
  const facility = facilities.find((item) => item.id === facilityId) || facilities[0];
  const original = useMemo(() => draftFor(facility), [facility]);
  const [draft, setDraft] = useState<Draft>(() => draftFor(facilities[0]));
  const [documents, setDocuments] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [reasonNote, setReasonNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoSource, setPhotoSource] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [removeCurrentPhotos, setRemoveCurrentPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const changes = useMemo(() => {
    const result: Record<string, unknown> = {};
    if (draft.name.trim() !== original.name.trim()) result.name = draft.name.trim();
    if (draft.address.trim() !== original.address.trim()) result.address = draft.address.trim();
    if (draft.description.trim() !== original.description.trim()) result.description = draft.description.trim();
    if (draft.phones.trim() !== original.phones.trim()) result.phones = [draft.phones.trim()].filter(Boolean);
    if (draft.emails.trim().toLowerCase() !== original.emails.trim().toLowerCase()) result.emails = [draft.emails.trim().toLowerCase()].filter(Boolean);
    if (draft.monthlyPriceFromUyu.trim() !== original.monthlyPriceFromUyu.trim()) result.monthlyPriceFromUyu = Number(draft.monthlyPriceFromUyu);
    if (JSON.stringify([...draft.priceIncludes].sort()) !== JSON.stringify([...original.priceIncludes].sort())) result.priceIncludes = draft.priceIncludes;
    return result;
  }, [draft, original]);
  const priceChanged = Object.hasOwn(changes, "monthlyPriceFromUyu");
  const photoReady = photos.length === 0 || (photoSource.trim().length >= 10 && rightsConfirmed);
  const canSubmit = enabled && facility && (Object.keys(changes).length > 0 || photos.length > 0 || documents.length > 0 || photosToDelete.length > 0) && photoReady && (!priceChanged || Boolean(draft.priceDate && draft.priceSourceUrl));

  function chooseFacility(value: string) {
    const id = Number(value); const next = facilities.find((item) => item.id === id);
    setFacilityId(id); setDraft(draftFor(next)); setDocuments([]); setReasonNote(""); setPhotos([]); setPhotosToDelete([]); setPhotoSource(""); setRightsConfirmed(false); setMessage("");
  }
  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted = [...files].filter((file) => file.type.startsWith("image/") && file.size > 0 && file.size <= 10 * 1024 * 1024);
    setPhotos((current) => [...current, ...accepted].slice(0, 10));
    if (accepted.length !== files.length) setMessage("Solo se admiten hasta 10 imágenes de 10 MB cada una.");
  }
  function addDocuments(files: FileList | null) {
    if (!files) return;
    const accepted = [...files].filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);
    setDocuments((current) => [...current, ...accepted].slice(0, 5));
    if (accepted.length !== files.length) setMessage("Solo se admiten hasta 5 documentos de 10 MB cada uno.");
  }
  async function upload(caseCode: string, uploadToken: string, file: File, purpose: "facility_photo" | "evidence" = "facility_photo") {
    const data = new FormData(); data.set("file", file); data.set("uploadToken", uploadToken); data.set("purpose", purpose);
    if (purpose === "facility_photo") { data.set("rightsSource", photoSource); data.set("rightsConfirmed", "true"); }
    const response = await fetch(`/api/intake-reports/${encodeURIComponent(caseCode)}/attachments`, { method: "POST", body: data });
    const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.error || `No se pudo subir ${file.name}.`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!canSubmit) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityId, changes, priceDate: priceChanged ? draft.priceDate : null, priceSourceUrl: priceChanged ? draft.priceSourceUrl : null, reasonNote, photoCount: photos.length, photoSource, photoRightsConfirmed: rightsConfirmed, photosToDelete }) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.error || "No se pudo crear la solicitud.");
      for (const photo of photos) await upload(result.caseCode, result.uploadToken, photo, "facility_photo");
      for (const doc of documents) await upload(result.caseCode, result.uploadToken, doc, "evidence");
      const finalize = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "finalize", caseCode: result.caseCode, uploadToken: result.uploadToken }) });
      const finalized = await finalize.json().catch(() => null); if (!finalize.ok) throw new Error(finalized?.error || "No se pudo finalizar la solicitud.");
      setDraft(draftFor(facility)); setDocuments([]); setReasonNote(""); setPhotos([]); setPhotosToDelete([]); setPhotoSource(""); setRightsConfirmed(false); setRemoveCurrentPhotos(false);
      setMessage(`Solicitud ${result.caseCode} enviada a revisión.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud."); } finally { setBusy(false); }
  }

    return <section className="institutionalWorkspace"><header className="institutionalPageHeader"><div><h1>Proponer cambios</h1><p>Los cambios se revisan antes de actualizar la ficha pública.</p></div></header>
    {!facilities.length ? <p className="registryEmptyResults">No hay ELEPEM asignados.</p> : <form className="facilityChangeForm" onSubmit={submit}>
      <label className="reportField"><span>ELEPEM</span><select value={facilityId} onChange={(event) => chooseFacility(event.target.value)}>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="reportFieldGrid">
        <label className="reportField"><span>Nombre</span><input value={draft.name} maxLength={300} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="reportField"><span>Dirección textual</span><input value={draft.address} maxLength={500} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
        <label className="reportField"><span>Teléfono</span><input type="tel" value={draft.phones} maxLength={100} onChange={(event) => setDraft({ ...draft, phones: event.target.value })} /></label>
        <label className="reportField"><span>Correo</span><input type="email" value={draft.emails} maxLength={200} onChange={(event) => setDraft({ ...draft, emails: event.target.value })} /></label>
      </div>
      <label className="reportField"><span>Descripción</span><textarea value={draft.description} maxLength={4000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      
      <section className="facilityChangeEvidence" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
        <h2>Fotografías</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginTop: "1rem", marginBottom: "1rem" }}>
          {facility.imageUrls && facility.imageUrls.map((url) => {
            const isDeleted = photosToDelete.includes(url);
            if (isDeleted) return null;
            return (
              <div key={url} style={{ position: "relative", aspectRatio: "4/3", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--borderLighter)" }}>
                <img src={url} alt="Foto actual" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setPhotosToDelete(curr => [...curr, url])} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: "50%", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} aria-label="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          
          {photos.map((file, index) => {
            const objectUrl = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${file.lastModified}`} style={{ position: "relative", aspectRatio: "4/3", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--primaryBase)" }}>
                <img src={objectUrl} alt="Foto nueva" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: "50%", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} aria-label={`Quitar ${file.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <label className="reportFilePicker" style={{ width: "fit-content" }}><input type="file" multiple accept="image/*" onChange={(event) => addPhotos(event.target.files)} /><ImagePlus size={18} />Agregar fotos</label>
        
        {photos.length > 0 && <div style={{ marginTop: "1rem" }}>
          <label className="reportField"><span>Procedencia de las fotos nuevas</span><input value={photoSource} maxLength={1000} onChange={(event) => setPhotoSource(event.target.value)} /></label>
          <label className="reportCheckbox"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>Confirmo que tengo autorización y derechos para publicar estas fotografías.</span></label>
        </div>}
      </section>

      <div className="reportFieldGrid"><label className="reportField"><span>Precio mensual UYU</span><input type="number" min={1} max={10000000} value={draft.monthlyPriceFromUyu} onChange={(event) => setDraft({ ...draft, monthlyPriceFromUyu: event.target.value })} /></label>{priceChanged && <><label className="reportField"><span>Fecha del precio</span><input type="date" required value={draft.priceDate} onChange={(event) => setDraft({ ...draft, priceDate: event.target.value })} /></label><label className="reportField"><span>URL pública de procedencia</span><input type="url" required value={draft.priceSourceUrl} onChange={(event) => setDraft({ ...draft, priceSourceUrl: event.target.value })} /></label></>}</div>
      <section className="facilityChangeEvidence" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
        <h2>Servicios incluidos</h2>
        {Object.entries(SERVICE_CATEGORIES).map(([category, services]) => (
          <div key={category} style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{category}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
              {services.map(service => (
                <label key={service} className="reportCheckbox">
                  <input type="checkbox" checked={draft.priceIncludes.includes(service)} onChange={(e) => {
                    if (e.target.checked) setDraft({ ...draft, priceIncludes: [...draft.priceIncludes, service] });
                    else setDraft({ ...draft, priceIncludes: draft.priceIncludes.filter(s => s !== service) });
                  }} />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
      <div className="reportFieldGrid">
        <label className="reportField"><span>¿Por qué estás haciendo los cambios?</span><textarea value={reasonNote} maxLength={2000} onChange={(event) => setReasonNote(event.target.value)} /></label>
        <div className="reportField">
          <span>¿Qué documentos respaldan estos cambios?</span>
          <label className="reportFilePicker" style={{ marginTop: "0.5rem" }}><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => addDocuments(event.target.files)} /><Paperclip size={18} />Adjuntar documentos</label>
          {documents.length > 0 && <ul className="facilityEvidenceList" style={{ marginTop: "0.5rem" }}>{documents.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><button type="button" onClick={() => setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${file.name}`}><Trash2 size={16} /></button></li>)}</ul>}
        </div>
      </div>
      {message && <p className="stateInboxFeedback" role="status" aria-live="polite"><CheckCircle2 size={17} />{message}</p>}
      <button type="submit" className="reportContinue" disabled={!canSubmit || busy}>{busy ? "Enviando..." : "Enviar cambios a revisión"}</button>
    </form>}
  </section>;
}

