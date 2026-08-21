"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Info } from "lucide-react";
import { useState, type FormEvent } from "react";

function montevideoIso(value: string) {
  const parsed = new Date(`${value}:00-03:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

export function VisitBookingForm({ facilityId, facilityName, accountEmail }: { facilityId: number; facilityName: string; accountEmail: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      facilityId,
      preferredStartAt: montevideoIso(String(data.get("preferredStartAt") || "")),
      contactName: data.get("contactName"), contactEmail: data.get("contactEmail"),
      contactPhone: data.get("contactPhone"), partySize: Number(data.get("partySize")),
      practicalNote: data.get("practicalNote"), acknowledgedNotConfirmation: data.get("acknowledged") === "on",
    }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.error || "No se pudo enviar la solicitud."); setBusy(false); return; }
    router.push("/cuenta/visitas?creada=1"); router.refresh();
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return <form className="visitBookingForm" onSubmit={submit}>
    <header><CalendarDays size={28} aria-hidden="true" /><div><h1>Solicitar una visita</h1><p>{facilityName}</p></div></header>
    <p className="visitNotice"><Info size={19} aria-hidden="true" /><span>Elegir un horario no confirma la visita. El ELEPEM debe aceptarlo o proponerte otro.</span></p>
    <div className="reportFieldGrid">
      <label className="reportField"><span>Fecha y hora preferida *</span><input name="preferredStartAt" type="datetime-local" min={tomorrow} required /></label>
      <label className="reportField"><span>Cantidad de asistentes *</span><select name="partySize" defaultValue="1">{[1,2,3,4,5,6].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label className="reportField"><span>Nombre de contacto *</span><input name="contactName" autoComplete="name" maxLength={120} required /></label>
      <label className="reportField"><span>Correo</span><input name="contactEmail" type="email" autoComplete="email" defaultValue={accountEmail} maxLength={254} /></label>
      <label className="reportField"><span>Teléfono</span><input name="contactPhone" type="tel" autoComplete="tel" maxLength={32} /></label>
    </div>
    <label className="reportField"><span>Nota práctica (opcional)</span><textarea name="practicalNote" maxLength={500} placeholder="Por ejemplo: necesitamos confirmar si la entrada tiene escalones." /><small>No incluyas diagnósticos, historias clínicas, documentos ni datos de residentes.</small></label>
    <label className="reportCheckbox"><input name="acknowledged" type="checkbox" required /><span>Entiendo que esto es una solicitud y no una visita confirmada.</span></label>
    {error && <p className="reportFieldError" role="alert">{error}</p>}
    <button className="reportContinue" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
  </form>;
}
