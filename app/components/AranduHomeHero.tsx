"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { MouseEvent } from "react";

export function AranduHomeHero() {
  function scrollToRegistry(event: MouseEvent<HTMLAnchorElement>) {
    const registry = document.getElementById("mapa-registro");
    if (!registry) return;
    event.preventDefault();
    registry.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  return <>
    <section className="aranduHero" aria-labelledby="arandu-hero-title">
      <div className="aranduHeroContent">
        <span className="aranduHeroKicker">INFORMACIÓN PARA ELEGIR</span>
        <h1 id="arandu-hero-title">Elegí con tranquilidad.</h1>
        <p>Consultá ELEPEM de todo Uruguay.</p>
        <div className="aranduHeroActions">
          <a className="aranduHeroPrimary" href="#mapa-registro" onClick={scrollToRegistry}>
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
    <p className="aranduHeroCredit">Fotografía: © Daniela Hernández.</p>
  </>;
}
