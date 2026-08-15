import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso del entorno de demostración de Arandú.",
};

export default function TerminosPage() {
  return <section className="card legalPage">
    <p className="eyebrow">Arandú</p>
    <h1>Términos y condiciones</h1>
    <p>Arandú es un prototipo académico. El padrón consultable se construye con datos públicos reales. Los puntos y contenidos identificados como demostración son ficticios, y las comunicaciones no se envían automáticamente a organismos.</p>
    <p>El registro sirve para consultar información y preparar decisiones; no reemplaza la evaluación personal ni las vías institucionales correspondientes.</p>
  </section>;
}
