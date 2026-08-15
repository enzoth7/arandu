import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Información de privacidad del entorno de demostración de Arandú.",
};

export default function PrivacidadPage() {
  return <section className="card legalPage">
    <p className="eyebrow">Arandú</p>
    <h1>Privacidad</h1>
    <p>El padrón consultable se construye con datos públicos reales. Los elementos identificados como demostración son ficticios. Las comunicaciones se guardan para revisión interna, no se envían automáticamente a organismos ni se publican sin revisión humana.</p>
    <p>Las decisiones sobre información pública requieren revisión humana y trazabilidad de la fuente.</p>
  </section>;
}
