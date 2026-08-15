import { ExternalLink } from "lucide-react";

const sources = [
  {
    citation: "Guidotti, C., Balbuena, M., Acosta, C., & Maciel, C. (2025, junio). Informe del Servicio de atención a situaciones de violencia, abuso y maltrato a las personas mayores. Intendencia de Montevideo; Centro Interdisciplinario de Envejecimiento, Universidad de la República.",
    href: "https://cien.ei.udelar.edu.uy/wp-content/uploads/2026/04/DIGITAL-Informe-Atencion-a-PM.pdf",
  },
  {
    citation: "Ministerio de Desarrollo Social. (2026, 12 de enero). Establecimientos de larga estadía para personas mayores con certificado social. gub.uy. Recuperado el 14 de agosto de 2026, de",
    href: "https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social",
  },
  {
    citation: "Ministerio de Salud Pública. (2026, 30 de junio). Listado de residenciales habilitados y certificados por MSP que alojan a personas mayores. gub.uy. Recuperado el 14 de agosto de 2026, de",
    href: "https://www.gub.uy/ministerio-salud-publica/comunicacion/comunicados/listado-residenciales-habilitados-certificados-msp-alojan-personas-mayores",
  },
  {
    citation: "Sistema Nacional Integrado de Cuidados. (2024, marzo). Informe anual 2023.",
    href: "https://www.gub.uy/sistema-cuidados/sites/sistema-cuidados/files/2024-04/Sistema%20de%20Cuidados%20Memoria%202023.pdf",
  },
  {
    citation: "Uruguay. (2016, 14 de noviembre). Decreto n.º 356/016: Reglamentación relativa a la regulación, habilitación y fiscalización que ofrezcan servicios de cuidados a personas mayores.",
    href: "https://www.impo.com.uy/bases/decretos/356-2016",
  },
  {
    citation: "Ministerio de Desarrollo Social, Instituto Nacional de las Personas Mayores, Sistema de Cuidados, & Ministerio de Salud. (2019). Elegir un centro de larga estadía: ¿Qué tener en cuenta?",
    href: "https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/elegir-centro-larga-estadia-tener-cuenta-folleto",
  },
  {
    citation: "Movimiento de Familiares y Residentes de Elepem. (2026, junio). Buenas prácticas de cuidado desde el rol del familiar/allegado de la persona mayor residente en ELEPEM.",
    href: "https://www.movimientoelepem.org.uy/documentos/otros-documentos/",
  },
] as const;

export function Sources() {
  return <div className="sourcesPage bibliographyPage">
    <section className="card sourcesHero sourcesSection">
      <div className="eyebrow">Base de evidencia</div>
      <h1>Fuentes y referencias</h1>
    </section>

    <section className="card bibliographySection" aria-labelledby="bibliography-title">
      <h2 id="bibliography-title">Documentos consultados</h2>
      <ol className="bibliographyList">
        {sources.map((source) => <li key={source.href}>
          <span>{source.citation}</span>{" "}
          <a href={source.href} target="_blank" rel="noopener noreferrer">
            {source.href}<ExternalLink size={15} aria-hidden="true" />
          </a>
        </li>)}
      </ol>
    </section>
  </div>;
}
