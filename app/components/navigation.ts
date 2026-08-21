// Arquitectura de navegación de Arandú.
//
// El producto público vive en la raíz: ya no existe el selector Persona /
// Organización, así que un segmento `/personas` no significaría nada. El acceso
// institucional queda discreto y autenticado bajo `/organizacion`.

export type View =
  // Público
  | "buscar"
  | "guia"
  | "experiencia"
  | "seguimiento"
  | "fuentes"
  // Organización
  | "residenciales"
  | "equipos"
  | "review"
  | "bandeja"
  | "mis_elepem"
  | "solicitudes"
  | "nuevo_cambio"
  | "agenda_visitas";

export type Portal = "public" | "state" | "facility";

export const PUBLIC_HOME = "/";
export const STATE_HOME = "/institucional/estado/bandeja";
export const FACILITY_HOME = "/institucional/elepem";
export const ACCOUNT_LOGIN = "/iniciar-sesion";

const publicViewPaths: Partial<Record<View, string>> = {
  buscar: PUBLIC_HOME,
  guia: "/guia",
  experiencia: "/experiencia",
  seguimiento: "/seguimiento",
  fuentes: "/fuentes",
};

const organizationViewPaths: Partial<Record<View, string>> = {
  bandeja: STATE_HOME,
  residenciales: "/institucional/estado/elepem",
  fuentes: "/institucional/estado/fuentes",
};

const facilityViewPaths: Partial<Record<View, string>> = {
  mis_elepem: FACILITY_HOME,
  solicitudes: "/institucional/elepem/solicitudes",
  nuevo_cambio: "/institucional/elepem/solicitudes/nueva",
  agenda_visitas: "/institucional/elepem/visitas",
};

export type NavItem = { view: View; label: string };

/** Navegación pública breve: cada destino corresponde a una tarea vigente. */
export const publicNavItems: readonly NavItem[] = [
  { view: "buscar", label: "Buscar" },
  { view: "guia", label: "Cómo elegir" },
  { view: "experiencia", label: "Experiencias" },
  { view: "fuentes", label: "Fuentes" },
];

export const organizationNavItems: readonly NavItem[] = [
  { view: "bandeja", label: "Bandeja" },
  { view: "residenciales", label: "ELEPEM" },
  { view: "fuentes", label: "Fuentes" },
];

export const facilityNavItems: readonly NavItem[] = [
  { view: "mis_elepem", label: "Mis ELEPEM" },
  { view: "solicitudes", label: "Solicitudes" },
  { view: "agenda_visitas", label: "Visitas" },
  { view: "nuevo_cambio", label: "Proponer cambio" },
];

export function navItemsFor(portal: Portal) {
  return portal === "state" ? organizationNavItems : portal === "facility" ? facilityNavItems : publicNavItems;
}

export function homeFor(portal: Portal) {
  return portal === "state" ? STATE_HOME : portal === "facility" ? FACILITY_HOME : PUBLIC_HOME;
}

/** Ruta de una vista dentro de un portal, con reserva al inicio del portal. */
export function pathFor(portal: Portal, view: View) {
  const paths = portal === "state" ? organizationViewPaths : portal === "facility" ? facilityViewPaths : publicViewPaths;
  return paths[view] ?? homeFor(portal);
}
