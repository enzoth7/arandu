
const fs = require("fs");
let content = fs.readFileSync("app/components/institutional/FacilityChangeForm.tsx", "utf-8");

const oldSectionRegex = /<section className="facilityChangeEvidence" style=\{\{ marginTop: "1rem", marginBottom: "1rem" \}\}>[\s\S]*?<\/section>\s*<div className="reportFieldGrid">/m;

const newSection = `<section className="facilityChangeEvidence" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
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
              <div key={\`\${file.name}-\${file.lastModified}\`} style={{ position: "relative", aspectRatio: "4/3", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--primaryBase)" }}>
                <img src={objectUrl} alt="Foto nueva" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: "50%", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} aria-label={\`Quitar \${file.name}\`}>
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

      <div className="reportFieldGrid">`;

content = content.replace(oldSectionRegex, newSection);

// We should also remove removeCurrentPhotos completely from state
content = content.replace(/const \[removeCurrentPhotos, setRemoveCurrentPhotos\] = useState\(false\);\n/, "");
content = content.replace(/ \|\| removeCurrentPhotos/g, "");
content = content.replace(/setRemoveCurrentPhotos\(false\); /g, "");
content = content.replace(/, removeCurrentPhotos/g, "");

fs.writeFileSync("app/components/institutional/FacilityChangeForm.tsx", content);

