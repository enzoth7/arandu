import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Información de privacidad del entorno de demostración de Arandú.",
};

export default function PrivacidadPage() {
  return <section className="card legalPage">
    <p className="eyebrow">Arandú</p>
    <h1>Privacidad</h1>
    <p>En este entorno de demostración se usan datos ficticios. No se envían comunicaciones a organismos ni se publica información automáticamente.</p>
    <p>Las decisiones sobre información pública requieren revisión humana y trazabilidad de la fuente.</p>
  </section>;
}
