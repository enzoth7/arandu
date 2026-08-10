"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Paperclip } from "lucide-react";
import type { DemoFacilityProfile } from "../../../lib/institutional-types";

export function FacilityChangeForm({ facilities, enabled }: { facilities: DemoFacilityProfile[]; enabled: boolean }) {
  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id || "");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [changes, setChanges] = useState({ name: "", address: "", description: "", phone: "", email: "", monthlyPriceFromUyu: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoSource, setPhotoSource] = useState("");
  const [photoRights, setPhotoRights] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");

  function update(key: keyof typeof changes, value: string) { setChanges((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/institutional/facility/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, effectiveDate, evidenceNote, changes, hasPhoto: Boolean(photo), photoSourceDeclaration: photoSource, photoRightsConfirmed: photoRights }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      let photoMessage = "";
      if (photo) {
        const formData = new FormData();
        formData.set("file", photo);
        formData.set("uploadToken", result.uploadToken);
        formData.set("purpose", "facility_photo");
        formData.set("rightsSource", photoSource);
        formData.set("rightsConfirmed", String(photoRights));
        const upload = await fetch(`/api/intake-reports/${encodeURIComponent(result.caseCode)}/attachments`, { method: "POST", body: formData });
        if (!upload.ok) photoMessage = " La solicitud se guardó, pero la foto no pudo adjuntarse.";
      }
      setCaseCode(result.caseCode);
      setMessage(`Solicitud demo recibida. Sólo podrá generar una vista previa.${photoMessage}`);
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "No se pudo guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseCode) return <section className="institutionalWorkspace facilityChangeSuccess"><CheckCircle2 size={42} /><h1>Solicitud enviada a revisión</h1><p>{message}</p><p className="reportCaseCode"><strong>{caseCode}</strong></p></section>;

  return <form className="institutionalWorkspace facilityChangeForm" onSubmit={submit}>
    <header className="institutionalPageHeader"><div><span className="demoPermanentBadge">Cambios demo · sin publicación</span><h1>Proponer un cambio</h1><p>La aprobación estatal genera una comparación privada. Nunca edita directamente el padrón público.</p></div></header>
    {!enabled && <p className="notice">La recepción demo está desactivada.</p>}
    <div className="reportFieldGrid"><label className="reportField"><span>ELEPEM asignado</span><select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.id}</option>)}</select></label><label className="reportField"><span>Fecha de vigencia del dato <em className="requiredMark">(obligatorio)</em></span><input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} required /></label></div>
    <label className="reportField"><span>Respaldo y fuente <em className="requiredMark">(obligatorio)</em></span><textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} minLength={10} maxLength={2000} required placeholder="Indicá qué documento, registro o antecedente respalda el cambio y su fecha." /></label>
    <h2>Datos propuestos</h2><p className="muted">Completá solamente los campos que querés modificar.</p>
    <div className="reportFieldGrid"><label className="reportField"><span>Nombre</span><input value={changes.name} onChange={(event) => update("name", event.target.value)} /></label><label className="reportField"><span>Dirección</span><input value={changes.address} onChange={(event) => update("address", event.target.value)} /></label></div>
    <label className="reportField"><span>Descripción de vida cotidiana</span><textarea value={changes.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} /></label>
    <div className="reportFieldGrid"><label className="reportField"><span>Teléfono comercial</span><input value={changes.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" /></label><label className="reportField"><span>Correo comercial</span><input value={changes.email} onChange={(event) => update("email", event.target.value)} type="email" /></label></div>
    <label className="reportField"><span>Precio mensual desde (UYU)</span><input value={changes.monthlyPriceFromUyu} onChange={(event) => update("monthlyPriceFromUyu", event.target.value)} type="number" min="1" max="10000000" /></label>
    <fieldset className="facilityPhotoField"><legend>Foto opcional</legend><label className="reportFilePicker"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /><Paperclip size={18} />{photo ? photo.name : "Elegir foto"}</label>{photo && <><label className="reportField"><span>Procedencia de la foto <em className="requiredMark">(obligatorio)</em></span><textarea value={photoSource} onChange={(event) => setPhotoSource(event.target.value)} minLength={10} required placeholder="Quién la produjo, cuándo y con qué autorización." /></label><label className="reportCheckbox"><input type="checkbox" checked={photoRights} onChange={(event) => setPhotoRights(event.target.checked)} required /><span>Declaro que el ELEPEM tiene derechos suficientes para usar esta foto y que no expone personas sin consentimiento.</span></label></>}</fieldset>
    {message && <p className="reportFieldError" role="alert">{message}</p>}
    <button type="submit" className="reportContinue" disabled={!enabled || submitting || facilities.length === 0}>{submitting ? "Guardando…" : "Enviar a revisión estatal"}</button>
  </form>;
}
