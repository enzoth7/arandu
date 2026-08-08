"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, ShieldAlert } from "lucide-react";
import { ACCESS_SESSION_KEY, navItemsFor, pathFor, type Portal } from "./navigation";

// Cabecera y marco compartidos por los dos portales.
//
// La navegación usa <Link> y no botones con router.push: son enlaces reales, así
// que funcionan con clic central, "abrir en pestaña nueva" y lectores de
// pantalla, y Next puede precargarlos.

export function PortalChrome({ portal, children }: { portal: Portal; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOrganization = portal === "organization";

  const leave = () => {
    if (isOrganization) {
      void fetch("/api/team/session", { method: "DELETE" }).catch(() => undefined);
    }
    try {
      window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
    } catch {
      // sessionStorage puede estar bloqueado; la cookie ya fue invalidada.
    }
    router.push("/");
    router.refresh();
  };

  return <main className={`site ${isOrganization ? "organizationSite" : "personSite"}`}>
    <header className="top">
      <div className="topin">
        <button type="button" className="brand" onClick={leave} aria-label="Volver a la selección">
          {isOrganization
            ? <>
                <Image src="/iconoarandu.png" alt="Arandú" className="brandLogo" width={70} height={70} priority/>
                <span>Arandú</span>
              </>
            : <div className="masCercaLogoContainer">
                <Image src="/mascerca.png" alt="Más Cerca" className="masCercaBrandImg" width={32} height={32} priority/>
              </div>}
        </button>

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
          <button type="button" className="profileReset" onClick={leave} aria-label="Salir">
            <LogOut size={16}/><span>Salir</span>
          </button>
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
