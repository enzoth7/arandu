import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExperienceForm } from "../../components/ExperienceForm";
import { loadVerifiedPersonalRelationships } from "../../../lib/brief-experience-db";
import { readAccountSession } from "../../../lib/institutional-auth";

export const metadata: Metadata = {
  title: "Compartir una experiencia",
  description: "Cinco preguntas breves sobre la vida cotidiana en un ELEPEM, con revisión humana antes de publicar.",
};

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const account = await readAccountSession();
  const next = params.elepem ? `/experiencia?elepem=${encodeURIComponent(params.elepem)}` : "/experiencia";
  if (!account) redirect(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
  const relationships = await loadVerifiedPersonalRelationships(account.userId);
  if (relationships.length === 0) {
    return <main className="publicSimplePage">
      <section className="institutionalCard">
        <p className="eyebrow">Experiencias verificadas</p>
        <h1>Tu vínculo todavía no está habilitado</h1>
        <p>Para proteger a las personas, la versión para residentes o familiares sólo se abre cuando el vínculo con un ELEPEM fue verificado. No podés elegirlo manualmente desde este formulario.</p>
      </section>
    </main>;
  }
  const requested = params.elepem || "";
  const initialFacilityKey = relationships.find((item) => item.facilityKey === requested || item.selectionKey === requested)?.selectionKey
    ?? relationships[0].selectionKey;
  return <ExperienceForm relationships={relationships} initialFacilityKey={initialFacilityKey} />;
}
