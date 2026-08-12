"use client";

import { Mail, Phone } from "lucide-react";

export const PRIVACY_OPTIONS = [
  ["Anónima", "No guardamos datos de contacto."],
  ["Confidencial", "El equipo puede usar el contacto sólo para revisar la situación."],
  ["Con identidad registrada", "El contacto queda vinculado de forma privada al expediente."],
] as const;

export type PrivacyChoice = (typeof PRIVACY_OPTIONS)[number][0];
export type PrivacyContact = { phone: string; email: string };

export function PrivacyContactBlock({
  privacy,
  contact,
  onPrivacyChange,
  onContactChange,
}: {
  privacy: PrivacyChoice;
  contact: PrivacyContact;
  onPrivacyChange: (privacy: PrivacyChoice) => void;
  onContactChange: (contact: PrivacyContact) => void;
}) {
  return <section className="privacyContactBlock" aria-label="Privacidad y contacto">
    <div className="reportOptionGrid isCompact" role="group" aria-label="Privacidad de la comunicación">
      {PRIVACY_OPTIONS.map(([label, description]) => <button
        type="button"
        key={label}
        className={`reportOption ${privacy === label ? "isSelected" : ""}`}
        aria-pressed={privacy === label}
        onClick={() => onPrivacyChange(label)}
      ><span className="reportOptionCopy"><strong>{label}</strong><small>{description}</small></span></button>)}
    </div>
    {privacy !== "Anónima" && <div className="reportFieldGrid reportContactData">
      <label className="reportField"><span><Phone size={15} aria-hidden="true" />Celular</span><input type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={(event) => onContactChange({ ...contact, phone: event.target.value })} /></label>
      <label className="reportField"><span><Mail size={15} aria-hidden="true" />Correo electrónico</span><input type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={(event) => onContactChange({ ...contact, email: event.target.value })} /></label>
    </div>}
  </section>;
}
