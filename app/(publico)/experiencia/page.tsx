import type { Metadata } from "next";
import { ExperienceForm } from "../../components/ExperienceForm";

export const metadata: Metadata = {
  title: "Compartir una experiencia",
  description: "Formulario de demostración para enviar una experiencia a revisión humana privada.",
};

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const enabled = process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true";
  return <ExperienceForm initialFacilityId={params.elepem || ""} enabled={enabled} />;
}
