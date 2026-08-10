"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Landmark, LockKeyhole, UserRound } from "lucide-react";
import type { InstitutionalRole } from "../../lib/institutional-types";

export function InstitutionalAccess({ initialRole = null }: { initialRole?: InstitutionalRole | null }) {
  const router = useRouter();
  const [role, setRole] = useState<InstitutionalRole | null>(initialRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/institutional/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, username, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "No se pudo ingresar.");
      router.push(role === "state" ? "/institucional/estado" : "/institucional/elepem");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo ingresar.");
      setSubmitting(false);
    }
  }

  return <main className="accessGate">
    <div className={`accessGatePanel ${role ? "isLogin" : ""}`}>
      <Image src="/arandu.png" alt="Arandú" className="accessGateLogo isOrganization" width={1536} height={1024} priority />
      <h1>Acceso institucional</h1>
      <p className="accessGateLead">Elegí el tipo de portal. Las credenciales demo y los permisos están separados por rol.</p>

      {!role ? <div className="accessChoiceGrid">
        <button type="button" className="accessChoiceCard accessChoiceOrganization" onClick={() => setRole("state")}>
          <span className="accessChoiceIcon"><Landmark size={42} /></span><strong>Soy el Estado</strong><small>Revisar preocupaciones, experiencias y solicitudes de cambio.</small>
        </button>
        <button type="button" className="accessChoiceCard accessChoicePerson" onClick={() => setRole("facility")}>
          <span className="accessChoiceIcon"><Building2 size={42} /></span><strong>Soy un ELEPEM</strong><small>Ver establecimientos asignados y proponer cambios para revisión.</small>
        </button>
      </div> : <form className="organizationLoginForm" onSubmit={submit}>
        <span className="demoPermanentBadge">Acceso demo · {role === "state" ? "Estado" : "ELEPEM"}</span>
        <label><span>Usuario</span><div className="accessInput"><UserRound size={19} /><input name="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} autoComplete="username" autoFocus /></div></label>
        <label><span>Contraseña</span><div className="accessInput"><LockKeyhole size={19} /><input name="password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="current-password" /></div></label>
        {error && <div className="accessLoginError" role="alert">{error}</div>}
        <button className="accessLoginSubmit" type="submit" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}<ArrowRight size={18} /></button>
        <button className="accessLoginBack" type="button" onClick={() => { setRole(null); setError(""); setPassword(""); }}><ArrowLeft size={17} />Elegir otro rol</button>
      </form>}
      <Link className="accessLoginBack" href="/"><ArrowLeft size={17} />Volver al sitio público</Link>
    </div>
  </main>;
}
