import type { Metadata } from "next";
import { loadPublicFacilitiesOrEmpty } from "../../lib/facility-registry";
import { PublicRegistry } from "../components/PublicRegistry";

export const metadata: Metadata = {
  title: "Buscar ELEPEM",
  description:
    "Buscá, compará y consultá información sobre establecimientos de larga estadía para personas mayores (ELEPEM) en Uruguay, con la fuente y la fecha de cada dato.",
};

// El padrón cambia poco: se revalida cada 5 minutos, igual que el s-maxage que
// publica /api/residenciales.
export const revalidate = 300;

export default async function BuscarElepemPage() {
  const facilities = await loadPublicFacilitiesOrEmpty();
  return <PublicRegistry initialFacilities={facilities} />;
}
