"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, UserRound } from "lucide-react";
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
// Si el usuario inició sesión, muestra «Hola, [Nombre]» con acceso directo a /cuenta.

export function PortalChrome({ portal, children }: { portal: Portal; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ displayName: string } | null>(null);
  const isInstitutional = portal !== "public";

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.authenticated) {
          setUserSession({ displayName: data.displayName });
        } else if (active) {
          setUserSession(null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUserSession(null);
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
            const link = (
              <Link
                key={item.view}
                href={href}
                className={`${isActive ? "active" : ""} nav-${item.view}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >{item.label}</Link>
            );
            if (item.view === "guia" && !isInstitutional) {
              return [
                link,
                <Link key="cta-visita" href="/cuenta/visitas" className="headerCtaVisita" onClick={() => setMenuOpen(false)}>
                  Agendar una visita
                </Link>,
              ];
            }
            return link;
          })}
        </nav>

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
            : userSession
              ? <Link className="institutionalAccess hasSession" href="/cuenta" title={`Mi cuenta (${userSession.displayName})`}>
                  <UserRound size={16}/><span>Hola, {userSession.displayName}</span>
                </Link>
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
            {userSession ? (
              <Link href="/cuenta">Mi cuenta ({userSession.displayName})</Link>
            ) : (
              <Link href="/iniciar-sesion">Acceso institucional</Link>
            )}
          </nav>
        </div>}
      </footer>
    </div>
  </main>;
}

