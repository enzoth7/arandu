import { ShieldAlert } from "lucide-react";

export function AcademicPrototypeNotice() {
  return (
    <aside className="aranduDemoBanner" aria-label="Aviso sobre el prototipo académico">
      <ShieldAlert size={24} aria-hidden="true" />
      <p>
        <strong>PROTOTIPO ACADÉMICO</strong> · El padrón consultable se construye con datos públicos reales.
        Los puntos y contenidos identificados como demostración son ficticios. Las comunicaciones se guardan para
        revisión interna, no se envían automáticamente a organismos y no constituyen un servicio oficial.
      </p>
    </aside>
  );
}
