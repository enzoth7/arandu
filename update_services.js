
const fs = require("fs");
let content = fs.readFileSync("app/components/institutional/FacilityChangeForm.tsx", "utf-8");

content = content.replace(
  `const COMMON_SERVICES = ["Enfermería 24hs", "Atención médica", "Fisioterapia", "Nutricionista", "Psicología", "Actividades recreativas", "Peluquería", "Podología", "Lavandería", "TV Cable", "WiFi"];`,
  `const SERVICE_CATEGORIES = {
  "Tipo de estadía": ["Estadía permanente", "Estadía temporal", "Estadía de respiro", "Centro de día", "Recuperación o convalecencia", "Rehabilitación"],
  "Habitación y privacidad": ["Habitación individual", "Habitación compartida", "Baño privado", "Baño compartido"],
  "Entorno": ["Jardín, patio o espacio exterior", "Espacios comunes", "Aire acondicionado", "Calefacción", "Iluminación natural"],
  "Accesibilidad y movilidad": ["Acceso sin escalones", "Ascensor o ayuda para escaleras", "Circulación para silla de ruedas", "Baño adaptado", "Barras de apoyo", "Ducha a nivel del piso", "Sistema de llamada en dormitorio o baño", "Camas articuladas o eléctricas"],
  "Cuidados y profesionales": ["Atención o asistencia durante las 24 horas", "Dirección técnica médica", "Médico general", "Médico geriatra", "Enfermería", "Fisioterapia", "Nutricionista", "Psicología", "Trabajo social o asistencia social", "Odontología", "Podología"],
  "Vida cotidiana y vínculos": ["Actividades y recreación", "Paseos y salidas", "Actividad física", "Música, arte o talleres", "Estimulación cognitiva", "Alimentación adaptada", "Menú visible", "Horarios amplios de visita", "Espacio privado para visitas o llamadas", "Acceso a teléfono", "Internet o Wi-Fi"]
};`
);

const oldServicesSection = `      <div className="reportField">
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
      </div>`;

const newServicesSection = `      <section className="facilityChangeEvidence" style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
        <h2>Servicios incluidos</h2>
        {Object.entries(SERVICE_CATEGORIES).map(([category, services]) => (
          <div key={category} style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--foregroundMuted)" }}>{category}</h3>
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
      </section>`;

content = content.replace(oldServicesSection, newServicesSection);

fs.writeFileSync("app/components/institutional/FacilityChangeForm.tsx", content);

