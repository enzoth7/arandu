import type { Metadata } from "next";
import { loadPublicFacilitiesOrEmpty } from "../../../lib/facility-registry";
import { PublicRegistry } from "../../components/PublicRegistry";

export const metadata: Metadata = {
  title: "Residenciales",
  description: "Buscá un ELEPEM en el mapa de Uruguay y consultá su situación administrativa, con la fuente y la fecha de cada dato.",
};

// El padrón cambia poco: se revalida cada 5 minutos, igual que el s-maxage que
// publica /api/residenciales.
export const revalidate = 300;

export default async function PersonasResidencialesPage() {
  const facilities = await loadPublicFacilitiesOrEmpty();
  return <PublicRegistry initialFacilities={facilities} />;
}
