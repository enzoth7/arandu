import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Eye, ListChecks } from "lucide-react";

export function AranduHomeHero() {
  return <>
    <section className="aranduHero" aria-labelledby="arandu-hero-title">
      <div className="aranduHeroContent">
        <span className="aranduHeroKicker">INFORMACIÓN PARA ELEGIR</span>
        <h1 id="arandu-hero-title">Elegí con tranquilidad.</h1>
        <p>Consultá ELEPEM de todo Uruguay.</p>
        <div className="aranduHeroActions">
          <a className="aranduHeroPrimary" href="#registro">
            Explorar el registro
          </a>
          <Link className="aranduHeroSecondary" href="/guia">
            <BookOpen size={19} aria-hidden="true" /> Cómo elegir
          </Link>
        </div>
      </div>
      <div className="aranduHeroVisual">
        <Image
          src="/Hero.webp"
          alt="Personas mayores conversan con una cuidadora en el patio de una residencia"
          fill
          priority
          sizes="(max-width: 760px) 100vw, 44vw"
          className="aranduHeroImage"
        />
      </div>
    </section>
    <p className="aranduHeroCredit">Fotografía: Daniela Hernández.</p>

    <div className="aranduTrustStrip" aria-label="Principios del registro">
      <span><Eye size={20} aria-hidden="true" /><strong>Fuentes visibles</strong></span>
      <span><CalendarDays size={20} aria-hidden="true" /><strong>Datos con fecha</strong></span>
      <span><ListChecks size={20} aria-hidden="true" /><strong>Criterios de revisión</strong></span>
      <Link href="/fuentes">Cómo usamos los datos</Link>
    </div>
  </>;
}
