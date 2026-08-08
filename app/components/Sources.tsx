"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

type SourceCard = {
  badge: string;
  tone: "green" | "blue" | "violet" | "navy";
  title: string;
  copy: string;
  href: string;
  linkLabel: string;
};

const mainSources: SourceCard[] = [
  {
    badge: "ETAPA 3 · MSP",
    tone: "green",
    title: "Habilitados a junio de 2026",
    copy: "La publicación oficial más reciente contiene 212 habilitados. Se usa para verificar vigencia, pero no se mezcla silenciosamente con coordenadas provenientes de otro corte.",
    href: "https://www.gub.uy/ministerio-salud-publica/comunicacion/comunicados/listado-residenciales-habilitados-certificados-msp-alojan-personas-mayores",
    linkLabel: "Abrir publicación",
  },
  {
    badge: "ETAPA 2 · MIDES",
    tone: "blue",
    title: "Certificado social",
    copy: "El directorio oficial informa 319 establecimientos con certificado social al 12 de enero de 2026 y los presenta como establecimientos en proceso de habilitación.",
    href: "https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social",
    linkLabel: "Abrir directorio",
  },
  {
    badge: "IM + CIEn",
    tone: "violet",
    title: "Informe de atención 2025",
    copy: "Fundamenta que la puerta de comunicación también contemple situaciones domiciliarias, consultas de terceros y problemas que finalmente pueden no clasificarse como violencia.",
    href: "https://cien.ei.udelar.edu.uy/wp-content/uploads/2026/04/DIGITAL-Informe-Atencion-a-PM.pdf",
    linkLabel: "Abrir informe",
  },
  {
    badge: "NORMA",
    tone: "navy",
    title: "Decreto 356/016",
    copy: "Define las tres etapas y, separadamente, observación, apercibimiento, sanción pecuniaria, suspensión y clausura definitiva.",
    href: "https://www.impo.com.uy/bases/decretos/356-2016",
    linkLabel: "Abrir norma",
  },
];

const backgroundSources: SourceCard[] = [
  {
    badge: "OFICIAL · AUDITORÍA",
    tone: "blue",
    title: "Universo y denuncias",
    copy: "La auditoría informa un universo de 1.481 ELEPEM y 133 denuncias recepcionadas, con datos a marzo de 2024.",
    href: "https://www.gub.uy/ministerio-economia-finanzas/sites/ministerio-economia-finanzas/files/documentos/publicaciones/2025_MinisteriodeDesarrolloSocial-InstitutoNacionaldelasPersonasMayores.pdf",
    linkLabel: "Abrir informe",
  },
];

const canAffirm = [
  "Que el nombre y domicilio aparecen en una fuente determinada.",
  "Qué etapa respalda esa fuente y cuál es su fecha.",
  "Qué precisión tiene el punto geográfico.",
  "Que la vigencia posterior requiere conciliación cuando el corte es anterior.",
];

const cannotAffirm = [
  "Que “no figura” significa clandestino.",
  "Que tener habilitación equivale a no haber tenido incidentes.",
  "Que un certificado histórico siga vigente hoy.",
  "Que una alerta equivale a una infracción confirmada.",
];

function SourceCards({ cards }: { cards: SourceCard[] }) {
  return <div className="grid three sourceCards">
    {cards.map((card) => (
      <div className="sourceCard" key={card.title}>
        <span className={`sourceBadge sourceBadge-${card.tone}`}>{card.badge}</span>
        <strong>{card.title}</strong>
        <p>{card.copy}</p>
        <a className="sourceLink" href={card.href} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14}/> {card.linkLabel}
        </a>
      </div>
    ))}
  </div>;
}

function SourceAccordion({
  title,
  icon,
  defaultOpen,
  delay,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return <div
    className={`sourcesSection accordion ${open ? "accordionOpen" : ""}`}
    style={{ animationDelay: `${delay || 0}ms` }}
  >
    <button type="button" className="accordionHeader" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="accordionHeaderIcon">{icon}</span>
      <span>{title}</span>
      <ChevronDown className="accordionChevron" size={20}/>
    </button>
    <div className="accordionBody"><div className="accordionContent"><div className="accordionInner">{children}</div></div></div>
  </div>;
}

export function Sources() {
  return <div className="sourcesPage">
    <section className="card sourcesHero sourcesSection">
      <div className="eyebrow">Base de evidencia</div>
      <h1>Fuentes, fechas y límites</h1>
      <p className="lead">El prototipo diferencia información administrativa, antecedentes verificables y alertas pendientes de revisión. Cada dato muestra su fuente y fecha para que pueda verificarse de forma independiente.</p>
    </section>

    <SourceAccordion title="Fuentes principales" icon="📋" delay={100}>
      <SourceCards cards={mainSources}/>
    </SourceAccordion>

    <SourceAccordion title="Lo que una ficha puede y no puede afirmar" icon="⚖️" delay={200}>
      <div className="affirmGrid">
        <div className="affirmBlock affirmBlock-yes">
          <h3>Lo que una ficha puede afirmar</h3>
          <ul>{canAffirm.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="affirmBlock affirmBlock-no">
          <h3>Lo que no puede afirmar</h3>
          <ul>{cannotAffirm.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </SourceAccordion>

    <SourceAccordion title={"Fuentes incorporadas en «Medidas y antecedentes»"} icon="📂" delay={300}>
      <SourceCards cards={backgroundSources}/>
    </SourceAccordion>

    <SourceAccordion title="Vacío de información" icon="⚠️" delay={500}>
      <div className="voidBlock">
        <p>No existe una base pública nacional única que, para cada ELEPEM, consolide las tres etapas, vencimientos, cambios de nombre o domicilio y todas las medidas administrativas vigentes. La solución propuesta no rellena esos vacíos por inferencia: los marca como datos pendientes de verificación.</p>
      </div>
    </SourceAccordion>
  </div>;
}
