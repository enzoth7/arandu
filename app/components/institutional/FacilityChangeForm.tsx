"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, FileText, ImagePlus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { DemoFacilityProfile } from "../../../lib/institutional-types";

type ChangeKey = "name" | "address" | "description" | "phone" | "email" | "monthlyPriceFromUyu";
type ChangeDraft = Record<ChangeKey, string>;
type ProposedPhoto = { id: string; file: File };

const FIELD_CONFIG: Array<{ key: ChangeKey; label: string; multiline?: boolean; type?: "email" | "number" | "text" }> = [
  { key: "name", label: "Nombre" }, { key: "address", label: "Dirección" }, { key: "description", label: "Descripción de vida cotidiana", multiline: true },
  { key: "phone", label: "Teléfono comercial" }, { key: "email", label: "Correo comercial", type: "email" }, { key: "monthlyPriceFromUyu", label: "Precio mensual desde", type: "number" },
];
const EVIDENCE_KEYS: ChangeKey[] = ["name", "address", "phone", "email", "monthlyPriceFromUyu"];

function draftFromFacility(facility: DemoFacilityProfile | undefined): ChangeDraft {
  return { name: facility?.name || "", address: facility?.address || "", description: facility?.description || "", phone: facility?.phone || "", email: facility?.email || "", monthlyPriceFromUyu: facility ? String(facility.monthlyPriceFromUyu) : "" };
}
function displayValue(key: ChangeKey, value: string) {
  if (!value.trim()) return "No informado";
  if (key === "monthlyPriceFromUyu") { const price = Number(value); return Number.isFinite(price) ? `$ ${price.toLocaleString("es-UY")}` : value; }
  return value;
}

function EditableFacilityField({ config, currentValue, draftValue, editing, onEdit, onCancel, onChange }: { config: (typeof FIELD_CONFIG)[number]; currentValue: string; draftValue: string; editing: boolean; onEdit: () => void; onCancel: () => void; onChange: (value: string) => void }) {
  const inputId = `facility-change-${config.key}`;
  return <div className={`facilityEditableField${editing ? " isEditing" : ""}`}><div className="facilityEditableSummary"><div><span>{config.label}</span><strong>{displayValue(config.key, currentValue)}</strong></div><button type="button" onClick={editing ? onCancel : onEdit}>{editing ? <RotateCcw size={16} /> : <Pencil size={16} />}{editing ? "Cancelar" : "Editar"}</button></div>{editing && <label className="reportField" htmlFor={inputId}><span>Nuevo valor</span>{config.multiline ? <textarea id={inputId} value={draftValue} onChange={(event) => onChange(event.target.value)} maxLength={2000} /> : <input id={inputId} value={draftValue} onChange={(event) => onChange(event.target.value)} type={config.type || "text"} inputMode={config.key === "phone" ? "tel" : undefined} min={config.type === "number" ? 1 : undefined} max={config.type === "number" ? 10000000 : undefined} />}</label>}</div>;
}

function ProposedPhotoPreview({ photo }: { photo: ProposedPhoto }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(photo.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.file]);
  // eslint-disable-next-line @next/next/no-img-element -- blob URL de una foto aún no subida.
  return preview ? <img className="facilityProposedPhotoPreview" src={preview} alt={`Vista previa de ${photo.file.name}`} /> : null;
}

export function FacilityChangeForm({ facilities, enabled }: { facilities: DemoFacilityProfile[]; enabled: boolean }) {
  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id || "");
  const selectedFacility = facilities.find((facility) => facility.id === facilityId) || facilities[0];
  const currentValues = useMemo(() => draftFromFacility(selectedFacility), [selectedFacility]);
  const [draft, setDraft] = useState<ChangeDraft>(() => draftFromFacility(facilities[0]));
  const [editing, setEditing] = useState<ChangeKey[]>([]);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [photos, setPhotos] = useState<ProposedPhoto[]>([]);
  const [photoSource, setPhotoSource] = useState("");
  const [photoRightsConfirmed, setPhotoRightsConfirmed] = useState(false);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");

  const proposedChanges = useMemo(() => {
    const result: Partial<ChangeDraft> = {};
    for (const key of editing) {
      const next = draft[key].trim(); const current = currentValues[key].trim();
      if (key === "monthlyPriceFromUyu") { if (next && Number(next) !== Number(current)) result[key] = next; }
      else if (next && next !== current) result[key] = next;
    }
    return result;
  }, [currentValues, draft, editing]);
  const hasChanges = Boolean(photos.length || removeCurrentPhoto || Object.keys(proposedChanges).length);
  const needsSupportingDocument = EVIDENCE_KEYS.some((key) => key in proposedChanges);
  const photosComplete = photos.length === 0 || (photoSource.trim().length >= 10 && photoRightsConfirmed);

  function selectFacility(nextId: string) {
    const nextFacility = facilities.find((facility) => facility.id === nextId);
    setFacilityId(nextId); setDraft(draftFromFacility(nextFacility)); setEditing([]); setPhotos([]); setPhotoSource(""); setPhotoRightsConfirmed(false); setPhotoEditorOpen(false); setRemoveCurrentPhoto(false); setDocuments([]); setMessage("");
  }
  function addPhotos(nextFiles: FileList | null) {
    if (!nextFiles) return;
    const accepted = [...nextFiles].filter((file) => ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024);
    setPhotos((current) => [...current, ...accepted.map((file) => ({ id: crypto.randomUUID(), file }))].slice(0, 10));
    if (accepted.length !== nextFiles.length || photos.length + accepted.length > 10) setMessage("Podés proponer hasta 10 fotos JPG, PNG, WebP o HEIC de hasta 10 MB.");
  }
  function addDocuments(nextFiles: FileList | null) {
    if (!nextFiles) return;
    const accepted = [...nextFiles].filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);
    setDocuments((current) => [...current, ...accepted].slice(0, 5));
    if (accepted.length !== nextFiles.length || documents.length + accepted.length > 5) setMessage("Podés adjuntar hasta 5 documentos de respaldo de hasta 10 MB.");
  }
  async function uploadFile(caseCodeValue: string, uploadToken: string, file: File, purpose: "facility_photo" | "supporting_document") {
    const body = new FormData(); body.set("file", file); body.set("uploadToken", uploadToken); body.set("purpose", purpose);
    if (purpose === "facility_photo") { body.set("rightsSource", photoSource); body.set("rightsConfirmed", String(photoRightsConfirmed)); }
    const response = await fetch(`/api/intake-reports/${encodeURIComponent(caseCodeValue)}/attachments`, { method: "POST", body });
    if (response.ok) return;
    const result = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof result?.error === "string" ? result.error : "No se pudo adjuntar el archivo privado.");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || !enabled || (needsSupportingDocument && documents.length === 0) || !photosComplete) return;
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityId, evidenceNote, changes: proposedChanges, photoCount: photos.length, removeCurrentPhoto }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo preparar la solicitud.");
      await Promise.all([
        ...photos.map((photo) => uploadFile(result.caseCode, result.uploadToken, photo.file, "facility_photo")),
        ...documents.map((file) => uploadFile(result.caseCode, result.uploadToken, file, "supporting_document")),
      ]);
      const finalResponse = await fetch("/api/institutional/facility/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "finalize", caseCode: result.caseCode, uploadToken: result.uploadToken }) });
      const finalized = await finalResponse.json();
      if (!finalResponse.ok) throw new Error(finalized.error || "No se pudo finalizar la solicitud.");
      setCaseCode(result.caseCode); setMessage("Solicitud recibida para revisión. Las fotos y documentos siguen siendo privados.");
    } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : "No se pudo guardar."); }
    finally { setSubmitting(false); }
  }

  if (caseCode) return <section className="institutionalWorkspace facilityChangeSuccess"><CheckCircle2 size={42} /><h1>Solicitud enviada a revisión</h1><p>{message}</p><p className="reportCaseCode"><strong>{caseCode}</strong></p></section>;
  return <form className="institutionalWorkspace facilityChangeForm" onSubmit={submit}>
    <header className="institutionalPageHeader"><div><h1>Proponer un cambio</h1><p>Los cambios no se publican hasta una revisión estatal. Fotos y documentos permanecen privados.</p></div></header>
    {!enabled && <p className="notice">La recepción de solicitudes está desactivada.</p>}
    <label className="reportField facilitySelector"><span>ELEPEM asignado</span><select value={facilityId} onChange={(event) => selectFacility(event.target.value)}>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
    {selectedFacility && <section className="facilityPhotoManager" aria-labelledby="facility-photo-manager-title">
      <div className="facilityPhotoManagerHeading"><div><h2 id="facility-photo-manager-title">Fotos</h2><p>Las fotos se revisan antes de cualquier cambio público.</p></div><button type="button" className="reportBack" onClick={() => setPhotoEditorOpen(true)} aria-expanded={photoEditorOpen} aria-controls="facility-photo-editor"><Pencil size={17} />Editar fotos</button></div>
      {photoEditorOpen && <div id="facility-photo-editor" className="facilityPhotoEditor"><label className="reportFilePicker"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(event) => addPhotos(event.target.files)} /><ImagePlus size={18} />Subir fotos</label><div className="facilityProposedPhotoGrid"><article className={`facilityPublishedPhoto${removeCurrentPhoto ? " isMarkedForRemoval" : ""}`}><Image className="facilityProposedPhotoPreview" src={selectedFacility.imageUrl} alt={selectedFacility.imageAlt} width={320} height={236} /><div><strong>Foto publicada actualmente</strong><button type="button" onClick={() => setRemoveCurrentPhoto((current) => !current)} aria-label={removeCurrentPhoto ? "Restaurar foto publicada" : "Quitar foto publicada"} aria-pressed={removeCurrentPhoto}><Trash2 size={16} /></button></div>{removeCurrentPhoto && <small>Marcada para retirar</small>}</article>{photos.map((photo, index) => <article key={photo.id}><ProposedPhotoPreview photo={photo} /><div><strong title={photo.file.name}>{photo.file.name}</strong><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} aria-label={`Quitar foto ${index + 1}`}><Trash2 size={16} /></button></div></article>)}</div>{photos.length > 0 && <div className="facilityPhotoProposal"><label className="reportField"><span>Procedencia de las fotos</span><textarea value={photoSource} onChange={(event) => setPhotoSource(event.target.value)} minLength={10} maxLength={1000} placeholder="Quién las produjo, cuándo y con qué autorización." /></label><label className="reportCheckbox"><input type="checkbox" checked={photoRightsConfirmed} onChange={(event) => setPhotoRightsConfirmed(event.target.checked)} /><span>Declaro que el ELEPEM tiene derechos suficientes sobre estas fotos y que no exponen personas sin consentimiento.</span></label></div>}</div>}
    </section>}
    <section className="facilityCurrentData" aria-labelledby="facility-current-data-title"><div className="facilityCurrentDataHeading"><div><h2 id="facility-current-data-title">Datos actuales</h2><p>Elegí sólo los datos que querés actualizar.</p></div><span>{editing.length} {editing.length === 1 ? "campo en edición" : "campos en edición"}</span></div><div className="facilityEditableGrid">{FIELD_CONFIG.map((config) => <EditableFacilityField config={config} currentValue={currentValues[config.key]} draftValue={draft[config.key]} editing={editing.includes(config.key)} onEdit={() => setEditing((current) => current.includes(config.key) ? current : [...current, config.key])} onCancel={() => { setDraft((current) => ({ ...current, [config.key]: currentValues[config.key] })); setEditing((current) => current.filter((item) => item !== config.key)); }} onChange={(value) => setDraft((current) => ({ ...current, [config.key]: value }))} key={config.key} />)}</div></section>
    <section className="facilityChangeEvidence" aria-labelledby="facility-change-evidence-title"><h2 id="facility-change-evidence-title">Respaldo del cambio</h2><label className="reportField"><span>Nota de contexto</span><textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} maxLength={2000} placeholder="Podés explicar el cambio o su fuente." /></label><label className="reportFilePicker facilityEvidencePicker"><input type="file" multiple onChange={(event) => addDocuments(event.target.files)} /><FileText size={18} />Adjuntar documentos de respaldo</label>{documents.length > 0 && <ul className="facilityEvidenceList">{documents.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}><span>{file.name}</span><button type="button" onClick={() => setDocuments((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Quitar ${file.name}`}><Trash2 size={16} /></button></li>)}</ul>}{needsSupportingDocument && documents.length === 0 && <p className="facilityChangeHint">Nombre, dirección, teléfono, correo y precio necesitan al menos un documento de respaldo.</p>}</section>
    {!hasChanges && <p className="facilityChangeHint">Elegí “Editar” o “Editar fotos” para preparar una solicitud.</p>}
    {message && <p className="reportFieldError" role="alert">{message}</p>}
    <button type="submit" className="reportContinue facilityChangeSubmit" disabled={!enabled || submitting || facilities.length === 0 || !hasChanges || (needsSupportingDocument && documents.length === 0) || !photosComplete}>{submitting ? "Enviando…" : "Enviar cambios a revisión"}</button>
  </form>;
}
