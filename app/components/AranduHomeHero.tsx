import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import portada from "../../CAMBIOS/Portada.png";

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
          src={portada}
          alt="Persona mayor en el balcón de una vivienda"
          fill
          priority
          sizes="(max-width: 760px) 100vw, 44vw"
          className="aranduHeroImage"
        />
      </div>
    </section>
  </>;
}
