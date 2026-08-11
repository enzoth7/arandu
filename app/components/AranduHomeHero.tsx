import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Eye, ShieldCheck } from "lucide-react";

export function AranduHomeHero() {
  return <>
    <section className="aranduHero" aria-labelledby="arandu-hero-title">
      <Image
        src="/arandu-hero-v2.webp"
        alt="Bandera de Uruguay junto a un paisaje sereno del Río de la Plata"
        fill
        priority
        sizes="100vw"
        className="aranduHeroImage"
      />
      <div className="aranduHeroShade" aria-hidden="true" />
      <div className="aranduHeroContent">
        <span className="aranduHeroKicker">Información para elegir</span>
        <h1 id="arandu-hero-title">Elegí con tranquilidad.</h1>
        <p>Consultá ELEPEM de todo Uruguay.</p>
        <div className="aranduHeroActions">
          <a className="aranduHeroPrimary" href="#registro">
            Buscar un ELEPEM
          </a>
          <Link className="aranduHeroSecondary" href="/guia">
            <BookOpen size={19} aria-hidden="true" /> Cómo elegir
          </Link>
        </div>
      </div>
    </section>

    <div className="aranduTrustStrip" aria-label="Principios del registro">
      <span><Eye size={20} aria-hidden="true" /><strong>Fuentes visibles</strong></span>
      <span><CalendarDays size={20} aria-hidden="true" /><strong>Datos con fecha</strong></span>
      <span><ShieldCheck size={20} aria-hidden="true" /><strong>Información verificada</strong></span>
      <Link href="/fuentes">Cómo usamos los datos</Link>
    </div>
  </>;
}
