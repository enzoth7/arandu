import type { Metadata } from "next";
import { IntakeReportForm } from "../../components/IntakeReportForm";
import { loadPublicFacilitiesOrEmpty } from "../../../lib/facility-registry";
import { canonicalDepartment, URUGUAY_DEPARTMENTS } from "../../../lib/uruguay.mjs";

export const metadata: Metadata = {
  title: "Comunicar una preocupación",
  description: "Contá una situación sobre vos o sobre otra persona mayor. La herramienta prepara una evaluación humana.",
};

export default async function PersonasDenunciaPage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const validDepartments = new Set(URUGUAY_DEPARTMENTS);
  const facilities = (await loadPublicFacilitiesOrEmpty())
    .map(({ id, name, locality, department }) => ({ id, name, locality, department: canonicalDepartment(department) }))
    .filter((facility) => validDepartments.has(facility.department))
    .sort((left, right) => left.name.localeCompare(right.name, "es-UY", { sensitivity: "base" }));
  return <IntakeReportForm facilities={facilities} initialFacilityId={params.elepem || ""} enabled={process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true"} />;
}
