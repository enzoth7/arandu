import { ShieldAlert } from "lucide-react";

export function AcademicPrototypeNotice() {
  return (
    <aside className="aranduDemoBanner" aria-label="Aviso sobre el prototipo académico">
      <ShieldAlert size={24} aria-hidden="true" />
      <p>
        <strong>PROTOTIPO ACADÉMICO</strong> · Usá sólo datos de demostración. Las comunicaciones se guardan para que el equipo las vea en su bandeja, pero no se envían a ningún organismo ni representan un servicio oficial.
      </p>
    </aside>
  );
}
