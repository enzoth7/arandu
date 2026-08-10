"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut, Menu, ShieldAlert } from "lucide-react";
import {
  homeFor,
  navItemsFor,
  INSTITUTIONAL_LOGIN,
  pathFor,
  type Portal,
} from "./navigation";

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

  const signOut = () => {
    void fetch("/api/institutional/session", { method: "DELETE" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  };

  return <main className={`site ${isInstitutional ? "organizationSite" : "publicSite"}`}>
    <header className="top">
      <div className="topin">
        <Link className="brand" href={homeFor(portal)} aria-label="+Cerca, ir al inicio">
          {isInstitutional
            ? <>
                <Image src="/iconoarandu.png" alt="" width={70} height={70} className="brandLogo" priority/>
                <span>Arandú</span>
              </>
            : <span className="masCercaLogoContainer">
                <Image src="/mascerca.png" alt="+Cerca" width={32} height={32} className="masCercaBrandImg" priority/>
              </span>}
        </Link>

        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegación principal">
          {navItemsFor(portal).map((item) => {
            const href = pathFor(portal, item.view);
            const isActive = pathname === href;
            return <Link
              key={item.view}
              href={href}
              className={isActive ? "active" : ""}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >{item.label}</Link>;
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
            : <Link className="institutionalAccess" href={INSTITUTIONAL_LOGIN}>
                <Building2 size={16}/><span>Acceso institucional</span>
              </Link>}
        </div>
      </div>
    </header>

    <div className="shell">
      <div className="banner">
        <ShieldAlert size={20}/>
        <span><strong>PROTOTIPO ACADÉMICO</strong> · Usá sólo datos de demostración. Las comunicaciones se guardan para que el equipo las vea en su bandeja, pero no se envían a ningún organismo ni representan un servicio oficial.</span>
      </div>
      {children}
    </div>
  </main>;
}
