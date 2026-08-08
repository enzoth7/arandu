import type { Metadata } from "next";
import { loadPublicFacilitiesOrEmpty } from "../../../../lib/facility-registry";
import { OrganizationFacilityRegistry } from "../../../components/team/OrganizationFacilityRegistry";

export const metadata: Metadata = {
  title: "Residenciales · Arandú",
  description: "Registro, habilitación y datos de ELEPEM para el equipo.",
  robots: { index: false, follow: false },
};

export default async function OrganizacionResidencialesPage() {
  const facilities = await loadPublicFacilitiesOrEmpty();
  return <OrganizationFacilityRegistry initialFacilities={facilities} />;
}
