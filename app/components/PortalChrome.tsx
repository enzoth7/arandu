"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu } from "lucide-react";
import {
  homeFor,
  navItemsFor,
  ACCOUNT_LOGIN,
  pathFor,
  type Portal,
} from "./navigation";
import { AcademicPrototypeNotice } from "./AcademicPrototypeNotice";

// Cabecera compartida por el producto público y el portal de organización.
//
// La navegación usa <Link>: son enlaces reales, así que funcionan con clic
// central, «abrir en pestaña nueva» y lectores de pantalla, y Next los precarga.
// El público no tiene sesión, así que no muestra «Salir»; en su lugar ofrece un
// acceso institucional discreto.

export function PortalChrome({ portal, children }: { portal: Portal; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isInstitutional = portal !== "public";

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/iniciar-sesion");
    router.refresh();
  };

  return <main className={`site ${isInstitutional ? "organizationSite" : "publicSite"}`}>
    <header className="top">
      <div className="topin">
        <Link className="brand" href={homeFor(portal)} aria-label="Arandú, ir al inicio">
          <Image src="/arandu-mark.svg" alt="" width={50} height={50} className="brandMark" priority />
          <span className="brandWordmark">Arandú</span>
        </Link>

        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegación principal">
          {navItemsFor(portal).map((item) => {
            const href = pathFor(portal, item.view);
            const isActive = pathname === href;
            return <Link
              key={item.view}
              href={href}
              className={`${isActive ? "active" : ""} nav-${item.view}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >{item.label}</Link>;
          })}
        </nav>

        {!isInstitutional && (
          <Link href="/cuenta/visitas" className="headerCtaVisita" onClick={() => setMenuOpen(false)}>
            Agendar una visita
          </Link>
        )}

        <div className="tools">
          <button
            type="button"
            className="menuToggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
          ><Menu size={17}/> Menú</button>

          {isInstitutional
            ? <button type="button" className="profileReset" onClick={signOut}>
                <LogOut size={16}/><span>Salir</span>
              </button>
            : <Link className="institutionalAccess" href={ACCOUNT_LOGIN}>
                <LogIn size={16}/><span>Acceso institucional</span>
              </Link>}
        </div>
      </div>
    </header>

    <div className="shell">
      <AcademicPrototypeNotice />
      {children}
      <footer className="aranduFooter">
        {portal === "public" && <div className="aranduFooterContent">
          <div className="aranduFooterIdentity">
            <Link href="/" className="aranduFooterBrand" aria-label="Arandú, ir al inicio">
              <Image src="/arandu-mark.svg" alt="" width={38} height={38} />
              <strong>Arandú</strong>
            </Link>
            <span>Información para elegir</span>
          </div>
          <nav className="aranduFooterLinks" aria-label="Enlaces del pie">
            <Link href="/iniciar-sesion">Acceso institucional</Link>
          </nav>
        </div>}
      </footer>
    </div>
  </main>;
}
