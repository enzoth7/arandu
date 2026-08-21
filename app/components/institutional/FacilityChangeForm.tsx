"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Trash2 } from "lucide-react";
import type { FacilityProfile } from "../../../lib/institutional-types";

type EditableKey = "name" | "address" | "description" | "phones" | "emails" | "monthlyPriceFromUyu";
type Draft = Record<EditableKey, string> & { priceDate: string; priceSourceUrl: string };

function lines(values: string[]) { return values.join("\n"); }
function splitLines(value: string) { return [...new Set(value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))]; }
function draftFor(facility?: FacilityProfile): Draft {
  return { name: facility?.name || "", address: facility?.address || "", description: facility?.description || "", phones: lines(facility?.phones || []), emails: lines(facility?.emails || []), monthlyPriceFromUyu: facility?.monthlyPriceFromUyu ? String(facility.monthlyPriceFromUyu) : "", priceDate: facility?.priceVerifiedAt || "", priceSourceUrl: facility?.priceSourceUrl || "" };
}

export function FacilityChangeForm({ facilities, enabled = true }: { facilities: FacilityProfile[]; enabled?: boolean }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || 0);
  const facility = facilities.find((item) => item.id === facilityId) || facilities[0];
  const original = useMemo(() => draftFor(facility), [facility]);
  const [draft, setDraft] = useState<Draft>(() => draftFor(facilities[0]));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoSource, setPhotoSource] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const changes = useMemo(() => {
    const result: Record<string, unknown> = {};
    if (draft.name.trim() !== original.name.trim()) result.name = draft.name.trim();
    if (draft.address.trim() !== original.address.trim()) result.address = draft.address.trim();
    if (draft.description.trim() !== original.description.trim()) result.description = draft.description.trim();
    if (JSON.stringify(splitLines(draft.phones)) !== JSON.stringify(splitLines(original.phones))) result.phones = splitLines(draft.phones);
    if (JSON.stringify(splitLines(draft.emails).map((item) => item.toLowerCase())) !== JSON.stringify(splitLines(original.emails).map((item) => item.toLowerCase()))) result.emails = splitLines(draft.emails).map((item) => item.toLowerCase());
    if (draft.monthlyPriceFromUyu.trim() !== original.monthlyPriceFromUyu.trim()) result.monthlyPriceFromUyu = Number(draft.monthlyPriceFromUyu);
    return result;
  }, [draft, original]);
  const priceChanged = Object.hasOwn(changes, "monthlyPriceFromUyu");
  const photoReady = photos.length === 0 || (photoSource.trim().length >= 10 && rightsConfirmed);
  const canSubmit = enabled && facility && (Object.keys(changes).length > 0 || photos.length > 0) && photoReady && (!priceChanged || Boolean(draft.priceDate && draft.priceSourceUrl));

  function chooseFacility(value: string) {
    const id = Number(value); const next = facilities.find((item) => item.id === id);
    setFacilityId(id); setDraft(draftFor(next)); setNote(""); setPhotos([]); setPhotoSource(""); setRightsConfirmed(false); setMessage("");
  }
  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted = [...files].filter((file) => file.type.startsWith("image/") && file.size > 0 && file.size <= 10 * 1024 * 1024);
    setPhotos((current) => [...current, ...accepted].slice(0, 10));
    if (accepted.length !== files.length) setMessage("Solo se admiten hasta 10 imágenes de 10 MB cada una.");
  }
  async function upload(caseCode: string, uploadToken: string, file: File) {
    const data = new FormData(); data.set("file", file); data.set("uploadToken", uploadToken); data.set("purpose", "facility_photo"); data.set("rightsSource", photoSource); data.set("rightsConfirmed", "true");
    const response = await fetch(`/api/intake-reports/${encodeURIComponent(caseCode)}/attachments`, { method: "POST", body: data });
    const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.error || `No se pudo subir ${file.name}.`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!canSubmit) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityId, changes, priceDate: priceChanged ? draft.priceDate : null, priceSourceUrl: priceChanged ? draft.priceSourceUrl : null, evidenceNote: note, photoCount: photos.length, photoSource, photoRightsConfirmed: rightsConfirmed }) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.error || "No se pudo crear la solicitud.");
      for (const photo of photos) await upload(result.caseCode, result.uploadToken, photo);
      const finalize = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "finalize", caseCode: result.caseCode, uploadToken: result.uploadToken }) });
      const finalized = await finalize.json().catch(() => null); if (!finalize.ok) throw new Error(finalized?.error || "No se pudo finalizar la solicitud.");
      setDraft(draftFor(facility)); setNote(""); setPhotos([]); setPhotoSource(""); setRightsConfirmed(false); setMessage(`Solicitud ${result.caseCode} enviada a revisión.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud."); } finally { setBusy(false); }
  }

  return <section className="institutionalWorkspace"><header className="institutionalPageHeader"><div><h1>Proponer cambios</h1><p>Los cambios se revisan antes de actualizar la ficha pública.</p></div></header>
    {!facilities.length ? <p className="registryEmptyResults">No hay ELEPEM asignados.</p> : <form className="facilityChangeForm" onSubmit={submit}>
      <label className="reportField"><span>ELEPEM</span><select value={facilityId} onChange={(event) => chooseFacility(event.target.value)}>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="reportFieldGrid">
        <label className="reportField"><span>Nombre</span><input value={draft.name} maxLength={300} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="reportField"><span>Dirección textual</span><input value={draft.address} maxLength={500} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
        <label className="reportField"><span>Teléfonos (uno por línea)</span><textarea value={draft.phones} maxLength={1000} onChange={(event) => setDraft({ ...draft, phones: event.target.value })} /></label>
        <label className="reportField"><span>Correos (uno por línea)</span><textarea value={draft.emails} maxLength={2000} onChange={(event) => setDraft({ ...draft, emails: event.target.value })} /></label>
      </div>
      <label className="reportField"><span>Descripción</span><textarea value={draft.description} maxLength={4000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <div className="reportFieldGrid"><label className="reportField"><span>Precio mensual UYU</span><input type="number" min={1} max={10000000} value={draft.monthlyPriceFromUyu} onChange={(event) => setDraft({ ...draft, monthlyPriceFromUyu: event.target.value })} /></label>{priceChanged && <><label className="reportField"><span>Fecha del precio</span><input type="date" required value={draft.priceDate} onChange={(event) => setDraft({ ...draft, priceDate: event.target.value })} /></label><label className="reportField"><span>URL pública de procedencia</span><input type="url" required value={draft.priceSourceUrl} onChange={(event) => setDraft({ ...draft, priceSourceUrl: event.target.value })} /></label></>}</div>
      <label className="reportField"><span>Nota de contexto</span><textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label>
      <section className="facilityChangeEvidence"><h2>Fotografías autorizadas</h2><label className="reportFilePicker"><input type="file" multiple accept="image/*" onChange={(event) => addPhotos(event.target.files)} /><ImagePlus size={18} />Agregar fotos</label>{photos.length > 0 && <><ul className="facilityEvidenceList">{photos.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${file.name}`}><Trash2 size={16} /></button></li>)}</ul><label className="reportField"><span>Procedencia de las fotos</span><input value={photoSource} maxLength={1000} onChange={(event) => setPhotoSource(event.target.value)} /></label><label className="reportCheckbox"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>Confirmo que tengo autorización y derechos para publicar estas fotografías.</span></label></>}</section>
      {message && <p className="stateInboxFeedback" role="status" aria-live="polite"><CheckCircle2 size={17} />{message}</p>}
      <button type="submit" className="reportContinue" disabled={!canSubmit || busy}>{busy ? "Enviando…" : "Enviar cambios a revisión"}</button>
    </form>}
  </section>;
}
