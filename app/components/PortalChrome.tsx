"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, Copy, LogOut, Menu, ShieldAlert } from "lucide-react";
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
  const [contactCopied, setContactCopied] = useState(false);
  const isInstitutional = portal !== "public";

  const signOut = () => {
    void fetch("/api/institutional/session", { method: "DELETE" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  };

  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText("contacto@arandu.com");
      setContactCopied(true);
      window.setTimeout(() => setContactCopied(false), 1800);
    } catch {
      setContactCopied(false);
    }
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
            <Link href="/fuentes">Datos y fuentes</Link>
            <Link href="/terminos">Términos y condiciones</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/acceso-institucional">Acceso institucional</Link>
          </nav>
          <div className="aranduFooterContact">
            <a href="mailto:contacto@arandu.com">contacto@arandu.com</a>
            <button type="button" onClick={copyContact} aria-label="Copiar correo de contacto" title="Copiar correo">
              {contactCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>}
        <div className="aranduFooterDemo" role="note">
          <ShieldAlert size={18} aria-hidden="true" />
          <span><strong>PROTOTIPO ACADÉMICO</strong> · Usa sólo datos de demostración.</span>
        </div>
      </footer>
    </div>
  </main>;
}
