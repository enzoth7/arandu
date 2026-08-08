import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  FileCheck2,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";
import { pathFor, type View } from "./navigation";

// Ambas variantes son menús de navegación, así que se dibujan con <Link> y no con
// botones: son enlaces reales y este componente puede quedar en el servidor.

type HomeAction = {
  view: View;
  Icon: typeof MapPin;
  title: string;
  copy: string;
  className: string;
};

const organizationActions: HomeAction[] = [
  { view: "residenciales", className: "action-blue", Icon: MapPin, title: "Residenciales", copy: "Registro, habilitación y datos de ELEPEM" },
  { view: "equipos", className: "action-violet", Icon: Users, title: "Equipos", copy: "Comunicaciones recibidas y gestión institucional" },
  { view: "fuentes", className: "action-amber", Icon: FileCheck2, title: "Fuentes", copy: "Origen, fecha y límites de los datos" },
];

const personOptions: HomeAction[] = [
  { view: "actividades", className: "optionActivities", Icon: Calendar, title: "Buscar una actividad", copy: "Talleres, recreación y espacios para personas mayores." },
  { view: "residenciales", className: "optionResidential", Icon: MapPin, title: "Consultar residenciales", copy: "Buscá un ELEPEM y revisá su situación administrativa." },
  { view: "denuncia", className: "optionConcern", Icon: ShieldAlert, title: "Comunicar una preocupación", copy: "Contá una situación sobre vos o sobre otra persona mayor." },
  { view: "seguimiento", className: "optionFollow", Icon: ClipboardCheck, title: "Seguir un trámite", copy: "Ingresá tu código y comprobá si la comunicación fue recibida." },
];

export function OrganizationHome() {
  return <section className="card hero homeHero">
    <div className="eyebrow">Acceso institucional</div>
    <h1>Herramientas de la organización</h1>
    <p className="lead">Elegí una de las tres áreas disponibles para trabajar en el prototipo.</p>
    <div className="grid three actionsGrid homeActions organizationHomeActions">
      {organizationActions.map(({ view, className, Icon, title, copy }) => (
        <Link className={`action ${className}`} href={pathFor("organization", view)} key={view}>
          <div className="actionIcon"><Icon size={28}/></div>
          <div className="actionCopy"><strong>{title}</strong><p>{copy}</p></div>
          <ArrowRight className="actionArrow" size={22}/>
        </Link>
      ))}
    </div>
  </section>;
}

export function PersonHome() {
  return <section className="personHome">
    <header className="personHomeHeader">
      <h1>¿Qué necesitás hoy?</h1>
      <p>Elegí una opción para empezar.</p>
    </header>
    <div className="personHomeGrid">
      {personOptions.map(({ view, className, Icon, title, copy }) => (
        <Link className={`personHomeOption ${className}`} href={pathFor("person", view)} key={view}>
          <Icon size={37}/>
          <strong>{title}</strong>
          <p>{copy}</p>
        </Link>
      ))}
    </div>
  </section>;
}
