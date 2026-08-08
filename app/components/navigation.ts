// Arquitectura de navegación de +Cerca.
//
// El producto público vive en la raíz: ya no existe el selector Persona /
// Organización, así que un segmento `/personas` no significaría nada. El acceso
// institucional queda discreto y autenticado bajo `/organizacion`.

export type View =
  // Público
  | "buscar"
  | "guia"
  | "preocupacion"
  | "seguimiento"
  | "fuentes"
  // Organización
  | "residenciales"
  | "equipos"
  | "review";

export type Portal = "public" | "organization";

export const PUBLIC_HOME = "/";
export const ORGANIZATION_HOME = "/organizacion/residenciales";
export const ORGANIZATION_LOGIN = "/organizacion/login";

const publicViewPaths: Partial<Record<View, string>> = {
  buscar: PUBLIC_HOME,
  guia: "/guia",
  preocupacion: "/preocupacion",
  seguimiento: "/seguimiento",
  fuentes: "/fuentes",
};

const organizationViewPaths: Partial<Record<View, string>> = {
  residenciales: ORGANIZATION_HOME,
  equipos: "/organizacion/equipos",
  review: "/organizacion/review",
  fuentes: "/organizacion/fuentes",
};

export type NavItem = { view: View; label: string };

/**
 * Navegación pública. Sólo se listan destinos que existen: «Compartir
 * experiencia» se incorpora cuando exista ese flujo, para no dejar entradas
 * que no lleven a ninguna parte.
 */
export const publicNavItems: readonly NavItem[] = [
  { view: "buscar", label: "Buscar ELEPEM" },
  { view: "guia", label: "Cómo elegir" },
  { view: "preocupacion", label: "Comunicar una preocupación" },
  { view: "seguimiento", label: "Seguimiento" },
  { view: "fuentes", label: "Cómo usamos los datos" },
];

export const organizationNavItems: readonly NavItem[] = [
  { view: "residenciales", label: "ELEPEM" },
  { view: "equipos", label: "Equipos" },
  { view: "fuentes", label: "Fuentes" },
];

export function navItemsFor(portal: Portal) {
  return portal === "organization" ? organizationNavItems : publicNavItems;
}

export function homeFor(portal: Portal) {
  return portal === "organization" ? ORGANIZATION_HOME : PUBLIC_HOME;
}

/** Ruta de una vista dentro de un portal, con reserva al inicio del portal. */
export function pathFor(portal: Portal, view: View) {
  const paths = portal === "organization" ? organizationViewPaths : publicViewPaths;
  return paths[view] ?? homeFor(portal);
}
