import type { DemoFacilityProfile } from "./institutional-types";

export const DEMO_FACILITIES: readonly DemoFacilityProfile[] = [
  {
    id: "DEMO-ELEPEM-001",
    name: "Casa Costa Serena",
    locality: "Localidad ficticia costera",
    department: "Canelones",
    address: "Camino Demostración 101 (dirección ficticia)",
    description: "Rutinas tranquilas, talleres de huerta y espacios comunes accesibles en una casa de una sola planta.",
    imageUrl: "/demo/elepem-costa-serena.webp",
    imageAlt: "Imagen sintética de un acceso residencial accesible sin personas",
    phone: "+598 000 001 001 (ficticio)",
    email: "costa-serena@demo.invalid",
    monthlyPriceFromUyu: 78_000,
    priceVerifiedAt: "2026-08-10",
    priceIncludes: ["alojamiento", "cuatro comidas", "actividades grupales", "lavandería básica"],
  },
  {
    id: "DEMO-ELEPEM-002",
    name: "Residencia Horizonte",
    locality: "Barrio ficticio central",
    department: "Montevideo",
    address: "Avenida Ejemplo 2020 (dirección ficticia)",
    description: "Vida cotidiana en grupos pequeños, sala luminosa y propuestas de lectura, música y movimiento adaptado.",
    imageUrl: "/demo/elepem-horizonte.webp",
    imageAlt: "Imagen sintética de una sala común accesible sin personas",
    phone: "+598 000 002 002 (ficticio)",
    email: "horizonte@demo.invalid",
    monthlyPriceFromUyu: 92_500,
    priceVerifiedAt: "2026-08-10",
    priceIncludes: ["alojamiento", "alimentación", "enfermería de referencia", "actividades"],
  },
  {
    id: "DEMO-ELEPEM-003",
    name: "Jardín del Litoral Demo",
    locality: "Zona ficticia del litoral",
    department: "Paysandú",
    address: "Pasaje de Prueba 303 (dirección ficticia)",
    description: "Patio protegido, galerías con sombra y una agenda cotidiana centrada en jardinería y encuentros familiares.",
    imageUrl: "/demo/elepem-jardin-del-prado.webp",
    imageAlt: "Imagen sintética de un jardín residencial accesible sin personas",
    phone: "+598 000 003 003 (ficticio)",
    email: "jardin-prado@demo.invalid",
    monthlyPriceFromUyu: 85_000,
    priceVerifiedAt: "2026-08-10",
    priceIncludes: ["alojamiento", "alimentación", "lavandería", "talleres de jardinería"],
  },
] as const;

export function demoFacilityById(id: string | null | undefined) {
  return DEMO_FACILITIES.find((facility) => facility.id === id) ?? null;
}
