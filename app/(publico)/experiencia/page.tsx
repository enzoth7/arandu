import type { Metadata } from "next";
import { ExperienceForm } from "../../components/ExperienceForm";
import { loadPublicFacilitiesOrEmpty } from "../../../lib/facility-registry";
import { canonicalDepartment, URUGUAY_DEPARTMENTS } from "../../../lib/uruguay.mjs";

export const metadata: Metadata = {
  title: "Compartir una experiencia",
  description: "Formulario para compartir una experiencia sobre un ELEPEM y enviarla a revisión humana privada.",
};

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const enabled = process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true";
  const validDepartments = new Set(URUGUAY_DEPARTMENTS);
  const facilities = (await loadPublicFacilitiesOrEmpty())
    .map(({ id, name, locality, department }) => ({ id, name, locality, department: canonicalDepartment(department) }))
    .filter((facility) => validDepartments.has(facility.department))
    .sort((left, right) => left.name.localeCompare(right.name, "es-UY", { sensitivity: "base" }));
  return <ExperienceForm facilities={facilities} initialFacilityId={params.elepem || ""} enabled={enabled} />;
}
