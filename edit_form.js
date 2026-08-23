
const fs = require("fs");
let content = fs.readFileSync("app/components/institutional/FacilityChangeForm.tsx", "utf-8");

content = content.replace(
  `import { CheckCircle2, ImagePlus, Trash2 } from "lucide-react";`,
  `import { CheckCircle2, ImagePlus, Trash2, Paperclip } from "lucide-react";`
);

content = content.replace(
  `type EditableKey = "name" | "address" | "description" | "phones" | "emails" | "monthlyPriceFromUyu" | "priceIncludes";\ntype Draft = Record<EditableKey, string> & { priceDate: string; priceSourceUrl: string };\n\nfunction lines(values: string[]) { return values.join("\\n"); }\nfunction splitLines(value: string) { return [...new Set(value.split(/[\\n,;]+/).map((item) => item.trim()).filter(Boolean))]; }\nfunction draftFor(facility?: FacilityProfile): Draft {\n  return { name: facility?.name || "", address: facility?.address || "", description: facility?.description || "", phones: lines(facility?.phones || []), emails: lines(facility?.emails || []), monthlyPriceFromUyu: facility?.monthlyPriceFromUyu ? String(facility.monthlyPriceFromUyu) : "", priceDate: facility?.priceVerifiedAt || "", priceSourceUrl: facility?.priceSourceUrl || "", priceIncludes: lines(facility?.priceIncludes || []) };\n}`,
  `type EditableKey = "name" | "address" | "description" | "phones" | "emails" | "monthlyPriceFromUyu";
type Draft = Record<EditableKey, string> & { priceDate: string; priceSourceUrl: string; priceIncludes: string[] };

const COMMON_SERVICES = ["Enfermería 24hs", "Atención médica", "Fisioterapia", "Nutricionista", "Psicología", "Actividades recreativas", "Peluquería", "Podología", "Lavandería", "TV Cable", "WiFi"];

function draftFor(facility?: FacilityProfile): Draft {
  return { name: facility?.name || "", address: facility?.address || "", description: facility?.description || "", phones: facility?.phones?.[0] || "", emails: facility?.emails?.[0] || "", monthlyPriceFromUyu: facility?.monthlyPriceFromUyu ? String(facility.monthlyPriceFromUyu) : "", priceDate: facility?.priceVerifiedAt || "", priceSourceUrl: facility?.priceSourceUrl || "", priceIncludes: facility?.priceIncludes || [] };
}`
);

content = content.replace(
  `const [evidenceNote, setEvidenceNote] = useState("");`,
  `const [documents, setDocuments] = useState<File[]>([]);\n  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);`
);

content = content.replace(
  `    if (JSON.stringify(splitLines(draft.phones)) !== JSON.stringify(splitLines(original.phones))) result.phones = splitLines(draft.phones);
    if (JSON.stringify(splitLines(draft.emails).map((item) => item.toLowerCase())) !== JSON.stringify(splitLines(original.emails).map((item) => item.toLowerCase()))) result.emails = splitLines(draft.emails).map((item) => item.toLowerCase());
    if (draft.monthlyPriceFromUyu.trim() !== original.monthlyPriceFromUyu.trim()) result.monthlyPriceFromUyu = Number(draft.monthlyPriceFromUyu);
    if (JSON.stringify(splitLines(draft.priceIncludes)) !== JSON.stringify(splitLines(original.priceIncludes))) result.priceIncludes = splitLines(draft.priceIncludes);`,
  `    if (draft.phones.trim() !== original.phones.trim()) result.phones = [draft.phones.trim()].filter(Boolean);
    if (draft.emails.trim().toLowerCase() !== original.emails.trim().toLowerCase()) result.emails = [draft.emails.trim().toLowerCase()].filter(Boolean);
    if (draft.monthlyPriceFromUyu.trim() !== original.monthlyPriceFromUyu.trim()) result.monthlyPriceFromUyu = Number(draft.monthlyPriceFromUyu);
    if (JSON.stringify([...draft.priceIncludes].sort()) !== JSON.stringify([...original.priceIncludes].sort())) result.priceIncludes = draft.priceIncludes;`
);

content = content.replace(
  `const canSubmit = enabled && facility && (Object.keys(changes).length > 0 || photos.length > 0 || removeCurrentPhotos) && photoReady && (!priceChanged || Boolean(draft.priceDate && draft.priceSourceUrl));`,
  `const canSubmit = enabled && facility && (Object.keys(changes).length > 0 || photos.length > 0 || documents.length > 0 || removeCurrentPhotos || photosToDelete.length > 0) && photoReady && (!priceChanged || Boolean(draft.priceDate && draft.priceSourceUrl));`
);

content = content.replace(
  `setFacilityId(id); setDraft(draftFor(next)); setEvidenceNote(""); setReasonNote(""); setPhotos([]); setPhotoSource(""); setRightsConfirmed(false); setRemoveCurrentPhotos(false); setMessage("");`,
  `setFacilityId(id); setDraft(draftFor(next)); setDocuments([]); setReasonNote(""); setPhotos([]); setPhotosToDelete([]); setPhotoSource(""); setRightsConfirmed(false); setRemoveCurrentPhotos(false); setMessage("");`
);

content = content.replace(
  `function addPhotos(files: FileList | null) {\n    if (!files) return;\n    const accepted = [...files].filter((file) => file.type.startsWith("image/") && file.size > 0 && file.size <= 10 * 1024 * 1024);\n    setPhotos((current) => [...current, ...accepted].slice(0, 10));\n    if (accepted.length !== files.length) setMessage("Solo se admiten hasta 10 imágenes de 10 MB cada una.");\n  }`,
  `function addPhotos(files: FileList | null) {\n    if (!files) return;\n    const accepted = [...files].filter((file) => file.type.startsWith("image/") && file.size > 0 && file.size <= 10 * 1024 * 1024);\n    setPhotos((current) => [...current, ...accepted].slice(0, 10));\n    if (accepted.length !== files.length) setMessage("Solo se admiten hasta 10 imágenes de 10 MB cada una.");\n  }\n  function addDocuments(files: FileList | null) {\n    if (!files) return;\n    const accepted = [...files].filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);\n    setDocuments((current) => [...current, ...accepted].slice(0, 5));\n  }`
);

content = content.replace(
  `async function upload(caseCode: string, uploadToken: string, file: File) {\n    const data = new FormData(); data.set("file", file); data.set("uploadToken", uploadToken); data.set("purpose", "facility_photo"); data.set("rightsSource", photoSource); data.set("rightsConfirmed", "true");`,
  `async function upload(caseCode: string, uploadToken: string, file: File, purpose: "facility_photo" | "evidence" = "facility_photo") {\n    const data = new FormData(); data.set("file", file); data.set("uploadToken", uploadToken); data.set("purpose", purpose);\n    if (purpose === "facility_photo") { data.set("rightsSource", photoSource); data.set("rightsConfirmed", "true"); }`
);

content = content.replace(
  `body: JSON.stringify({ facilityId, changes, priceDate: priceChanged ? draft.priceDate : null, priceSourceUrl: priceChanged ? draft.priceSourceUrl : null, evidenceNote, reasonNote, photoCount: photos.length, photoSource, photoRightsConfirmed: rightsConfirmed, removeCurrentPhotos })`,
  `body: JSON.stringify({ facilityId, changes, priceDate: priceChanged ? draft.priceDate : null, priceSourceUrl: priceChanged ? draft.priceSourceUrl : null, reasonNote, photoCount: photos.length, photoSource, photoRightsConfirmed: rightsConfirmed, removeCurrentPhotos, photosToDelete })`
);

content = content.replace(
  `for (const photo of photos) await upload(result.caseCode, result.uploadToken, photo);`,
  `for (const photo of photos) await upload(result.caseCode, result.uploadToken, photo, "facility_photo");\n      for (const doc of documents) await upload(result.caseCode, result.uploadToken, doc, "evidence");`
);

content = content.replace(
  `setDraft(draftFor(facility)); setEvidenceNote(""); setReasonNote(""); setPhotos([]); setPhotoSource(""); setRightsConfirmed(false); setRemoveCurrentPhotos(false);`,
  `setDraft(draftFor(facility)); setDocuments([]); setReasonNote(""); setPhotos([]); setPhotosToDelete([]); setPhotoSource(""); setRightsConfirmed(false); setRemoveCurrentPhotos(false);`
);

let uiChanges = `
      <div className="reportFieldGrid">
        <label className="reportField"><span>Nombre</span><input value={draft.name} maxLength={300} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="reportField"><span>Dirección textual</span><input value={draft.address} maxLength={500} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
        <label className="reportField"><span>Teléfono</span><input type="tel" value={draft.phones} maxLength={100} onChange={(event) => setDraft({ ...draft, phones: event.target.value })} /></label>
        <label className="reportField"><span>Correo</span><input type="email" value={draft.emails} maxLength={200} onChange={(event) => setDraft({ ...draft, emails: event.target.value })} /></label>
      </div>
      <label className="reportField"><span>Descripción</span><textarea value={draft.description} maxLength={4000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>

      <section className="facilityChangeEvidence" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <h2>Fotografías</h2>
        {facility.imageUrls && facility.imageUrls.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ marginBottom: "0.5rem" }}><strong>Fotos actuales:</strong></p>
            <ul className="facilityEvidenceList">
              {facility.imageUrls.map((url) => {
                const isDeleted = photosToDelete.includes(url);
                return (
                  <li key={url} style={{ opacity: isDeleted ? 0.5 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <img src={url} alt="Foto actual" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                      <span style={{ fontSize: "0.85rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.split("/").pop()}</span>
                    </div>
                    <button type="button" onClick={() => setPhotosToDelete(curr => isDeleted ? curr.filter(u => u !== url) : [...curr, url])} aria-label="Eliminar">
                      {isDeleted ? "Deshacer" : <Trash2 size={16} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <label className="reportCheckbox"><input type="checkbox" checked={removeCurrentPhotos} onChange={(event) => setRemoveCurrentPhotos(event.target.checked)} /><span>Eliminar TODAS las fotografías anteriores.</span></label>
        <label className="reportFilePicker"><input type="file" multiple accept="image/*" onChange={(event) => addPhotos(event.target.files)} /><ImagePlus size={18} />Agregar fotos nuevas</label>
        {photos.length > 0 && <><ul className="facilityEvidenceList">{photos.map((file, index) => <li key={\`\${file.name}-\${file.lastModified}\`}><span>{file.name}</span><button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={\`Quitar \${file.name}\`}><Trash2 size={16} /></button></li>)}</ul>
        <label className="reportField"><span>Procedencia de las fotos</span><input value={photoSource} maxLength={1000} onChange={(event) => setPhotoSource(event.target.value)} /></label>
        <label className="reportCheckbox"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>Confirmo que tengo autorización y derechos para publicar estas fotografías.</span></label></>}
      </section>

      <div className="reportFieldGrid"><label className="reportField"><span>Precio mensual UYU</span><input type="number" min={1} max={10000000} value={draft.monthlyPriceFromUyu} onChange={(event) => setDraft({ ...draft, monthlyPriceFromUyu: event.target.value })} /></label>{priceChanged && <><label className="reportField"><span>Fecha del precio</span><input type="date" required value={draft.priceDate} onChange={(event) => setDraft({ ...draft, priceDate: event.target.value })} /></label><label className="reportField"><span>URL pública de procedencia</span><input type="url" required value={draft.priceSourceUrl} onChange={(event) => setDraft({ ...draft, priceSourceUrl: event.target.value })} /></label></>}</div>
      <div className="reportField">
        <span>Servicios incluidos</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", marginTop: "0.5rem" }}>
          {COMMON_SERVICES.map(service => (
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
      <div className="reportFieldGrid">
        <label className="reportField"><span>¿Por qué estás haciendo los cambios?</span><textarea value={reasonNote} maxLength={2000} onChange={(event) => setReasonNote(event.target.value)} /></label>
        <div className="reportField">
          <span>¿Qué documentos respaldan estos cambios?</span>
          <label className="reportFilePicker" style={{ marginTop: "0.5rem" }}><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => addDocuments(event.target.files)} /><Paperclip size={18} />Adjuntar documentos</label>
          {documents.length > 0 && <ul className="facilityEvidenceList" style={{ marginTop: "0.5rem" }}>{documents.map((file, index) => <li key={\`\${file.name}-\${file.lastModified}\`}><span>{file.name}</span><button type="button" onClick={() => setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={\`Quitar \${file.name}\`}><Trash2 size={16} /></button></li>)}</ul>}
        </div>
      </div>
`;

content = content.replace(
  /<div className="reportFieldGrid">[\s\S]*?<label className="reportField"><span>¿Qué documentos respaldan estos cambios\?<\/span><textarea value=\{evidenceNote\} maxLength=\{2000\} onChange=\{\(event\) => setEvidenceNote\(event.target.value\)\} \/><\/label>\n      <\/div>\n      <section className="facilityChangeEvidence">[\s\S]*?<\/section>/,
  uiChanges
);

fs.writeFileSync("app/components/institutional/FacilityChangeForm.tsx", content);

