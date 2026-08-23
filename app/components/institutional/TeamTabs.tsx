"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { InstitutionalRole } from "../../../lib/institutional-types";

export function TeamTabs({ role }: { role: InstitutionalRole | undefined }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  if (!role) return null;

  return (
    <nav className="teamTabs">
      {role === "administrator" && (
        <>
          <Link 
            href="/equipo/admin?tab=roles" 
            className={`teamTab ${pathname === "/equipo/admin" && tab === "roles" ? "active" : ""}`}
          >
            Roles y funciones
          </Link>
          <Link 
            href="/equipo/admin" 
            className={`teamTab ${pathname === "/equipo/admin" && tab !== "roles" ? "active" : ""}`}
          >
            Solicitudes de representación
          </Link>
        </>
      )}
      {(role === "administrator" || role === "verifier") && (
        <Link 
          href="/equipo/verificaciones" 
          className={`teamTab ${pathname === "/equipo/verificaciones" ? "active" : ""}`}
        >
          Verificaciones
        </Link>
      )}
      {(role === "administrator" || role === "moderator") && (
        <Link 
          href="/equipo/moderacion" 
          className={`teamTab ${pathname === "/equipo/moderacion" ? "active" : ""}`}
        >
          Moderación
        </Link>
      )}
    </nav>
  );
}
