import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readAccountSession } from "../../../../lib/institutional-auth";
import { loadPublicFacilityByRegistryId } from "../../../../lib/facility-registry";
import { facilityHasVisitAgenda } from "../../../../lib/visit-scheduling-db";
import { VisitBookingForm } from "../../../components/visits/VisitBookingForm";

export const metadata: Metadata = { title: "Solicitar visita" };
export const dynamic = "force-dynamic";

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const { elepem } = await searchParams;
  const facilityId = Number(elepem);
  if (!Number.isSafeInteger(facilityId) || facilityId <= 0) notFound();
  const next = `/cuenta/visitas/nueva?elepem=${facilityId}`;
  const account = await readAccountSession();
  if (!account) redirect(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
  const facility = await loadPublicFacilityByRegistryId(facilityId);
  if (!facility) notFound();
  const available = await facilityHasVisitAgenda(facilityId);
  return <main className="visitBookingPage">{available
    ? <VisitBookingForm facilityId={facilityId} facilityName={facility.name} accountEmail={account.email} />
    : <section className="visitUnavailable"><h1>Agenda no disponible</h1><p>Este ELEPEM todavía no gestiona visitas desde Arandú. Podés usar los datos públicos de contacto de su ficha.</p><Link className="reportContinue" href={`/elepem/${facility.id}`}>Volver a la ficha</Link></section>}
  </main>;
}
