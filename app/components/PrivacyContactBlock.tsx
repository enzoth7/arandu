"use client";

import { Mail, Phone } from "lucide-react";

export const PRIVACY_OPTIONS = [
  "Anónima",
  "Confidencial",
  "Con identidad registrada",
] as const;

export const CONCERN_RELATIONSHIP_OPTIONS = [
  "Soy la persona afectada",
  "Familiar",
  "Vecino o vecina",
  "Trabajador o profesional",
  "Otra relación",
  "Prefiero no decirlo",
] as const;

const PRIVACY_NOTICES: Record<PrivacyChoice, { tone: "gray" | "yellow" | "green"; text: string }> = {
  "Anónima": {
    tone: "gray",
    text: "No te pediremos nombre, teléfono ni correo electrónico. El equipo no podrá llamarte ni escribirte. Evitá incluir información que permita identificarte en el relato o en los archivos que adjuntes.",
  },
  "Confidencial": {
    tone: "yellow",
    text: "El equipo autorizado podrá ver tus datos para comunicarse contigo y pedirte información adicional. Tu identidad no se mostrará al establecimiento ni a la persona señalada. Si fuera necesario comunicarla a otro organismo, se te informará para qué y con quién se compartiría, salvo que exista una obligación o excepción legal aplicable.",
  },
  "Con identidad registrada": {
    tone: "green",
    text: "Tu nombre y tus datos de contacto quedarán vinculados a la comunicación. El equipo podrá utilizarlos para verificar información, contactarte y gestionar la situación. Esto no significa que tu identidad se publique ni que se comunique automáticamente al establecimiento o a la persona señalada.",
  },
};

export type PrivacyChoice = (typeof PRIVACY_OPTIONS)[number];
export type ConcernRelationship = (typeof CONCERN_RELATIONSHIP_OPTIONS)[number] | "";
export type PrivacyContact = { name: string; phone: string; email: string };

export function PrivacyContactBlock({
  privacy,
  relationship,
  contact,
  onPrivacyChange,
  onRelationshipChange,
  onContactChange,
}: {
  privacy: PrivacyChoice;
  relationship: ConcernRelationship;
  contact: PrivacyContact;
  onPrivacyChange: (privacy: PrivacyChoice) => void;
  onRelationshipChange: (relationship: ConcernRelationship) => void;
  onContactChange: (contact: PrivacyContact) => void;
}) {
  const notice = PRIVACY_NOTICES[privacy];

  return <section className="privacyContactBlock" aria-label="Privacidad y contacto">
    <header className="privacyContactHeader">
      <h2>¿Cómo querés que manejemos tus datos?</h2>
      <p>Esta elección se refiere a tus datos como persona que comunica la situación. No cambia la prioridad con la que se evaluará el riesgo. En todos los casos deberás aportar información suficiente para localizar y comprender la situación.</p>
    </header>

    <div className="reportOptionGrid isCompact privacyChoiceGrid" role="group" aria-label="Privacidad de la comunicación">
      {PRIVACY_OPTIONS.map((label) => <button
        type="button"
        key={label}
        className={`reportOption ${privacy === label ? "isSelected" : ""}`}
        aria-pressed={privacy === label}
        onClick={() => onPrivacyChange(label)}
      ><span className="reportOptionCopy"><strong>{label}</strong></span></button>)}
    </div>

    <p className={`privacyNotice privacyNotice-${notice.tone}`} role="status">{notice.text}</p>

    <fieldset className="privacyRelationshipGroup">
      <legend>Relación con la persona o los hechos</legend>
      <div className="reportOptionGrid isCompact" role="group" aria-label="Relación con la persona o los hechos">
        {CONCERN_RELATIONSHIP_OPTIONS.map((option) => <button
          type="button"
          key={option}
          className={`reportOption ${relationship === option ? "isSelected" : ""}`}
          aria-pressed={relationship === option}
          onClick={() => onRelationshipChange(option)}
        ><span className="reportOptionCopy"><strong>{option}</strong></span></button>)}
      </div>
    </fieldset>

    {privacy !== "Anónima" && <div className="reportFieldGrid reportContactData privacyContactFields">
      <label className="reportField privacyContactName"><span>Nombre</span><input type="text" autoComplete="name" maxLength={160} placeholder="Ej.: María Rodríguez" value={contact.name} onChange={(event) => onContactChange({ ...contact, name: event.target.value })} /></label>
      <label className="reportField"><span><Phone size={15} aria-hidden="true" />Teléfono</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="Ej.: 099 123 456" value={contact.phone} onChange={(event) => onContactChange({ ...contact, phone: event.target.value })} /></label>
      <label className="reportField"><span><Mail size={15} aria-hidden="true" />Correo electrónico</span><input type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="Ej.: nombre@correo.com" value={contact.email} onChange={(event) => onContactChange({ ...contact, email: event.target.value })} /></label>
    </div>}
  </section>;
}
