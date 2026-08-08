"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { ORGANIZATION_HOME } from "./navigation";

export function OrganizationLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/team/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "No se pudo ingresar.";
        throw new Error(message);
      }
      setPassword("");
      router.push(ORGANIZATION_HOME);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo ingresar.");
      setSubmitting(false);
    }
  };

  return <main className="accessGate">
    <div className="accessGatePanel isLogin">
      <Image
        src="/arandu.png"
        alt="Arandú"
        className="accessGateLogo isOrganization"
        width={1536}
        height={1024}
        priority
      />
      <p className="accessGateLead">Ingreso de organización</p>
      <form className="organizationLoginForm" onSubmit={submit}>
        <label>
          <span>Usuario</span>
          <div className="accessInput">
            <UserRound size={19}/>
            <input
              name="username"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(""); }}
              autoComplete="username"
              autoFocus
            />
          </div>
        </label>
        <label>
          <span>Contraseña</span>
          <div className="accessInput">
            <LockKeyhole size={19}/>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(""); }}
              autoComplete="current-password"
            />
          </div>
        </label>
        {error && <div className="accessLoginError" role="alert">{error}</div>}
        <button className="accessLoginSubmit" type="submit" disabled={submitting}>
          {submitting ? "Ingresando…" : "Ingresar"} <ArrowRight size={18}/>
        </button>
      </form>
      <Link className="accessLoginBack" href="/"><ArrowLeft size={17}/> Volver</Link>
    </div>
  </main>;
}
