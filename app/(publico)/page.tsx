import type { Metadata } from "next";
import { loadDemoMapFacilitiesOrEmpty, loadPublicFacilitiesOrEmpty } from "../../lib/facility-registry";
import { PublicRegistry } from "../components/PublicRegistry";

export const metadata: Metadata = {
  title: { absolute: "Arandú | Información para elegir" },
  description:
    "Buscá y consultá información sobre establecimientos de larga estadía para personas mayores (ELEPEM) en Uruguay, con la fuente y la fecha de cada dato.",
};

// El padrón se administra directamente desde Supabase. Cada recarga pública
// consulta el estado actual, sin depender de una ventana de revalidación.
export const dynamic = "force-dynamic";

export default async function BuscarElepemPage() {
  const demoMode = process.env.DEMO_MODE === "true";
  const [facilities, demoFacilities] = await Promise.all([
    loadPublicFacilitiesOrEmpty(),
    loadDemoMapFacilitiesOrEmpty(demoMode),
  ]);
  return <PublicRegistry initialFacilities={facilities} demoFacilities={demoFacilities} demoMode={demoMode} />;
}
