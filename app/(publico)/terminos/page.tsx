import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso del entorno de demostración de Arandú.",
};

export default function TerminosPage() {
  return <section className="card legalPage">
    <p className="eyebrow">Arandú</p>
    <h1>Términos y condiciones</h1>
    <p>Este es un entorno de demostración. La información y las interacciones son ficticias y no se envían a organismos.</p>
    <p>El registro sirve para consultar información y preparar decisiones; no reemplaza la evaluación personal ni las vías institucionales correspondientes.</p>
  </section>;
}
