"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Paperclip, Pencil, RotateCcw } from "lucide-react";
import type { DemoFacilityProfile } from "../../../lib/institutional-types";

type ChangeKey = "name" | "address" | "description" | "phone" | "email" | "monthlyPriceFromUyu";
type ChangeDraft = Record<ChangeKey, string>;

const FIELD_CONFIG: Array<{
  key: ChangeKey;
  label: string;
  multiline?: boolean;
  type?: "email" | "number" | "text";
}> = [
  { key: "name", label: "Nombre" },
  { key: "address", label: "Dirección" },
  { key: "description", label: "Descripción de vida cotidiana", multiline: true },
  { key: "phone", label: "Teléfono comercial" },
  { key: "email", label: "Correo comercial", type: "email" },
  { key: "monthlyPriceFromUyu", label: "Precio mensual desde", type: "number" },
];

function draftFromFacility(facility: DemoFacilityProfile | undefined): ChangeDraft {
  return {
    name: facility?.name || "",
    address: facility?.address || "",
    description: facility?.description || "",
    phone: facility?.phone || "",
    email: facility?.email || "",
    monthlyPriceFromUyu: facility ? String(facility.monthlyPriceFromUyu) : "",
  };
}

function displayValue(key: ChangeKey, value: string) {
  if (!value.trim()) return "No informado";
  if (key === "monthlyPriceFromUyu") {
    const price = Number(value);
    return Number.isFinite(price) ? `$ ${price.toLocaleString("es-UY")}` : value;
  }
  return value;
}

function EditableFacilityField({
  config,
  currentValue,
  draftValue,
  editing,
  onEdit,
  onCancel,
  onChange,
}: {
  config: (typeof FIELD_CONFIG)[number];
  currentValue: string;
  draftValue: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
}) {
  const inputId = `facility-change-${config.key}`;
  return (
    <div className={`facilityEditableField${editing ? " isEditing" : ""}`}>
      <div className="facilityEditableSummary">
        <div>
          <span>{config.label}</span>
          <strong>{displayValue(config.key, currentValue)}</strong>
        </div>
        <button type="button" onClick={editing ? onCancel : onEdit}>
          {editing ? <RotateCcw size={16} /> : <Pencil size={16} />}
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>
      {editing && (
        <label className="reportField" htmlFor={inputId}>
          <span>Nuevo valor</span>
          {config.multiline ? (
            <textarea id={inputId} value={draftValue} onChange={(event) => onChange(event.target.value)} maxLength={2000} />
          ) : (
            <input
              id={inputId}
              value={draftValue}
              onChange={(event) => onChange(event.target.value)}
              type={config.type || "text"}
              inputMode={config.key === "phone" ? "tel" : undefined}
              min={config.type === "number" ? 1 : undefined}
              max={config.type === "number" ? 10000000 : undefined}
            />
          )}
        </label>
      )}
    </div>
  );
}

export function FacilityChangeForm({ facilities, enabled }: { facilities: DemoFacilityProfile[]; enabled: boolean }) {
  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id || "");
  const selectedFacility = facilities.find((facility) => facility.id === facilityId) || facilities[0];
  const currentValues = useMemo(() => draftFromFacility(selectedFacility), [selectedFacility]);
  const [draft, setDraft] = useState<ChangeDraft>(() => draftFromFacility(facilities[0]));
  const [editing, setEditing] = useState<ChangeKey[]>([]);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoSource, setPhotoSource] = useState("");
  const [photoRights, setPhotoRights] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");

  const proposedChanges = useMemo(() => {
    const result: Partial<ChangeDraft> = {};
    for (const key of editing) {
      const next = draft[key].trim();
      const current = currentValues[key].trim();
      if (key === "monthlyPriceFromUyu") {
        if (next && Number(next) !== Number(current)) result[key] = next;
      } else if (next && next !== current) {
        result[key] = next;
      }
    }
    return result;
  }, [currentValues, draft, editing]);
  const hasChanges = Boolean(photo || Object.keys(proposedChanges).length);

  function selectFacility(nextId: string) {
    const nextFacility = facilities.find((facility) => facility.id === nextId);
    setFacilityId(nextId);
    setDraft(draftFromFacility(nextFacility));
    setEditing([]);
    setPhoto(null);
    setPhotoSource("");
    setPhotoRights(false);
  }

  function update(key: ChangeKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function cancelEdit(key: ChangeKey) {
    setDraft((current) => ({ ...current, [key]: currentValues[key] }));
    setEditing((current) => current.filter((item) => item !== key));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/institutional/facility/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          effectiveDate,
          evidenceNote,
          changes: proposedChanges,
          hasPhoto: Boolean(photo),
          photoSourceDeclaration: photoSource,
          photoRightsConfirmed: photoRights,
        }),
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
      setMessage(`Solicitud recibida. Sólo podrá generar una vista previa.${photoMessage}`);
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "No se pudo guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseCode) {
    return <section className="institutionalWorkspace facilityChangeSuccess"><CheckCircle2 size={42} /><h1>Solicitud enviada a revisión</h1><p>{message}</p><p className="reportCaseCode"><strong>{caseCode}</strong></p></section>;
  }

  return (
    <form className="institutionalWorkspace facilityChangeForm" onSubmit={submit}>
      <header className="institutionalPageHeader">
        <div><h1>Proponer un cambio</h1><p>Revisá la ficha actual y editá únicamente los datos que querés actualizar.</p></div>
      </header>
      {!enabled && <p className="notice">La recepción de solicitudes está desactivada.</p>}

      <label className="reportField facilitySelector">
        <span>ELEPEM asignado</span>
        <select value={facilityId} onChange={(event) => selectFacility(event.target.value)}>
          {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
        </select>
      </label>

      {selectedFacility && (
        <>
          <section className="facilityCurrentPhoto" aria-label="Foto actual">
            <Image src={selectedFacility.imageUrl} alt={selectedFacility.imageAlt} width={560} height={320} />
            <div>
              <span>Foto actual</span>
              <strong>{photo ? photo.name : "La imagen que está publicada ahora"}</strong>
              <label className="reportFilePicker">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                <Paperclip size={18} />{photo ? "Elegir otra foto" : "Cambiar foto"}
              </label>
            </div>
          </section>

          {photo && (
            <div className="facilityPhotoRights">
              <label className="reportField"><span>Procedencia de la nueva foto <em className="requiredMark">(obligatorio)</em></span><textarea value={photoSource} onChange={(event) => setPhotoSource(event.target.value)} minLength={10} required placeholder="Quién la produjo, cuándo y con qué autorización." /></label>
              <label className="reportCheckbox"><input type="checkbox" checked={photoRights} onChange={(event) => setPhotoRights(event.target.checked)} required /><span>Declaro que el ELEPEM tiene derechos suficientes para usar esta foto y que no expone personas sin consentimiento.</span></label>
            </div>
          )}

          <section className="facilityCurrentData" aria-labelledby="facility-current-data-title">
            <div className="facilityCurrentDataHeading">
              <div><h2 id="facility-current-data-title">Datos actuales</h2><p>Los cambios no se publican hasta que sean revisados.</p></div>
              <span>{editing.length} {editing.length === 1 ? "campo en edición" : "campos en edición"}</span>
            </div>
            <div className="facilityEditableGrid">
              {FIELD_CONFIG.map((config) => (
                <EditableFacilityField
                  config={config}
                  currentValue={currentValues[config.key]}
                  draftValue={draft[config.key]}
                  editing={editing.includes(config.key)}
                  onEdit={() => setEditing((current) => current.includes(config.key) ? current : [...current, config.key])}
                  onCancel={() => cancelEdit(config.key)}
                  onChange={(value) => update(config.key, value)}
                  key={config.key}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="facilityChangeEvidence" aria-labelledby="facility-change-evidence-title">
        <h2 id="facility-change-evidence-title">Información del cambio</h2>
        <div className="reportFieldGrid">
          <label className="reportField"><span>Fecha de vigencia del dato <em className="requiredMark">(obligatorio)</em></span><input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} required /></label>
        </div>
        <label className="reportField"><span>Respaldo y fuente <em className="requiredMark">(obligatorio)</em></span><textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} minLength={10} maxLength={2000} required placeholder="Indicá qué documento, registro o antecedente respalda el cambio y su fecha." /></label>
      </section>

      {!hasChanges && <p className="facilityChangeHint">Elegí “Editar” o cambiá la foto para preparar una solicitud.</p>}
      {message && <p className="reportFieldError" role="alert">{message}</p>}
      <button type="submit" className="reportContinue facilityChangeSubmit" disabled={!enabled || submitting || facilities.length === 0 || !hasChanges}>
        {submitting ? "Enviando…" : "Enviar cambios a revisión"}
      </button>
    </form>
  );
}
