
const fs = require("fs");
let content = fs.readFileSync("app/components/institutional/FacilityChangeForm.tsx", "utf-8");

const newUI = `  return <section className="institutionalWorkspace"><header className="institutionalPageHeader"><div><h1>Proponer cambios</h1><p>Los cambios se revisan antes de actualizar la ficha pública.</p></div></header>
    {!facilities.length ? <p className="registryEmptyResults">No hay ELEPEM asignados.</p> : <form className="facilityChangeForm" onSubmit={submit}>
      <label className="reportField"><span>ELEPEM</span><select value={facilityId} onChange={(event) => chooseFacility(event.target.value)}>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
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
      {message && <p className="stateInboxFeedback" role="status" aria-live="polite"><CheckCircle2 size={17} />{message}</p>}
      <button type="submit" className="reportContinue" disabled={!canSubmit || busy}>{busy ? "Enviando…" : "Enviar cambios a revisión"}</button>
    </form>}
  </section>;
}
`;

content = content.replace(/return <section className="institutionalWorkspace">[\s\S]+<\/section>;\n}/, newUI);
fs.writeFileSync("app/components/institutional/FacilityChangeForm.tsx", content);

