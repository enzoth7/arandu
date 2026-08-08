// Configuración de navegación de los dos portales. Antes la barra de personas
// se escribía a mano en el JSX mientras la de organización se generaba desde una
// lista, así que ambas podían divergir; ahora las dos salen de aquí.

export type View =
  | "inicio"
  | "actividades"
  | "denuncia"
  | "seguimiento"
  | "residenciales"
  | "residenciales_form"
  | "review"
  | "equipos"
  | "fuentes";

export type Portal = "person" | "organization";

export const ACCESS_SESSION_KEY = "alerta-mayor-access";

export const PERSON_HOME = "/personas";
export const ORGANIZATION_HOME = "/organizacion/residenciales";

export const personViewPaths: Partial<Record<View, string>> = {
  inicio: PERSON_HOME,
  actividades: "/personas/actividades",
  denuncia: "/personas/denuncia",
  seguimiento: "/personas/seguimiento",
  residenciales: "/personas/residenciales",
  residenciales_form: "/personas/residenciales/form",
  fuentes: "/personas/fuentes",
};

export const orgViewPaths: Partial<Record<View, string>> = {
  residenciales: ORGANIZATION_HOME,
  review: "/organizacion/review",
  equipos: "/organizacion/equipos",
  fuentes: "/organizacion/fuentes",
};

export type NavItem = { view: View; label: string };

export const personNavItems: readonly NavItem[] = [
  { view: "inicio", label: "Inicio" },
  { view: "actividades", label: "Actividades" },
  { view: "residenciales", label: "Residenciales" },
  { view: "denuncia", label: "Comunicar una preocupación" },
  { view: "seguimiento", label: "Seguir un trámite" },
  { view: "fuentes", label: "Fuentes" },
];

export const organizationNavItems: readonly NavItem[] = [
  { view: "residenciales", label: "Residenciales" },
  { view: "equipos", label: "Equipos" },
  { view: "fuentes", label: "Fuentes" },
];

/** Vistas que cada portal no puede mostrar y que fuerzan una redirección. */
const personBlockedViews: readonly View[] = ["review", "equipos"];
const organizationBlockedViews: readonly View[] = ["denuncia", "seguimiento"];

export function isBlockedView(portal: Portal, view: View) {
  return portal === "organization"
    ? organizationBlockedViews.includes(view)
    : personBlockedViews.includes(view);
}

export function navItemsFor(portal: Portal) {
  return portal === "organization" ? organizationNavItems : personNavItems;
}

/** Ruta destino de una vista dentro de un portal, con reserva al inicio. */
export function pathFor(portal: Portal, view: View) {
  if (portal === "organization") {
    return isBlockedView(portal, view) ? ORGANIZATION_HOME : orgViewPaths[view] ?? ORGANIZATION_HOME;
  }
  return isBlockedView(portal, view) ? PERSON_HOME : personViewPaths[view] ?? PERSON_HOME;
}
