"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock3, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type StatusResult = {
  caseCode: string;
  receivedAt: string;
  currentStatus: string;
  events: {
    status: string;
    title: string;
    description: string;
    createdAt: string;
  }[];
  demo?: boolean;
};

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ReportStatusLookup({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStatus = async (targetCode: string) => {
    const normalized = targetCode.trim().toUpperCase();
    if (!normalized) return;
    setMessage("");
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/intake-reports/status?code=${encodeURIComponent(normalized)}`, { cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("caseCode" in data) || typeof data.caseCode !== "string" || !("receivedAt" in data) || typeof data.receivedAt !== "string" || !("events" in data) || !Array.isArray(data.events)) {
        const error = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se encontró ese código.";
        throw new Error(error);
      }
      setResult(data as StatusResult);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo consultar el estado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      void fetchStatus(initialCode);
    }
  }, [initialCode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchStatus(code);
  };

  return <section className="statusLookup">
    <header className="statusLookupHeader">
      <h1>Seguir una comunicación</h1>
      <p>Consultá si fue recibida usando el código que apareció al finalizar el formulario. No mostramos el contenido ni datos personales.</p>
    </header>

    <form className="statusLookupForm" onSubmit={submit}>
      <label><span>Código de seguimiento</span><div><Search size={19}/><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ej.: AM-20260728-085F9FB4" autoComplete="off"/></div></label>
      <button type="submit" disabled={loading || !code.trim()}>{loading ? "Consultando…" : "Consultar estado"}</button>
    </form>

    {message && <div className="statusLookupMessage" role="alert">{message}</div>}
    {result && <article className="statusResult">
      <div className="statusResultHeading"><span><ShieldCheck size={23}/></span><div><small>Comunicación encontrada</small><h2>{result.caseCode}</h2><p>Recibida {formattedDate(result.receivedAt)}</p></div></div>
      <ol className="statusTimeline">
        {result.events.map((event, index) => {
          const isCurrent = index === result.events.length - 1;
          return <li key={`${event.status}-${event.createdAt}-${index}`} className={isCurrent ? "isCurrent" : "isDone"}>
            <span>{isCurrent ? <Clock3 size={16}/> : <Check size={16}/>}</span>
            <div><strong>{event.title}</strong><small>{event.description}</small><time>{formattedDate(event.createdAt)}</time></div>
          </li>;
        })}
        <li><span>{result.events.length + 1}</span><div><strong>Próxima actualización</strong><small>Cuando el equipo registre un avance, aparecerá acá sin mostrar datos personales.</small></div></li>
      </ol>
      <p className="statusPrivacyNote">El seguimiento público muestra sólo información mínima compatible con la privacidad de la comunicación.</p>
    </article>}

    <Link className="statusLookupBack" href="/personas"><ArrowLeft size={17}/> Volver al inicio</Link>
  </section>;
}
