import type { Metadata } from "next";
import { loadPublicFacilitiesOrEmpty } from "../../../../lib/facility-registry";
import { OrganizationFacilityRegistry } from "../../../components/team/OrganizationFacilityRegistry";
export const metadata: Metadata = { title: "ELEPEM · Estado", robots: { index: false, follow: false } };
export default async function StateFacilitiesPage() { return <OrganizationFacilityRegistry initialFacilities={await loadPublicFacilitiesOrEmpty()} />; }
