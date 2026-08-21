import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { FacilityProfile } from "../../../components/FacilityProfile";
import { resolvePublicFacilityRoute } from "../../../../lib/public-facility-route";

type FacilityPageProps = {
  params: Promise<{ codigo: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: FacilityPageProps): Promise<Metadata> {
  const { codigo } = await params;
  const resolved = await resolvePublicFacilityRoute(codigo);
  if (!resolved) return { title: "ELEPEM no encontrado" };
  const { facility, canonicalPath } = resolved;
  const description = facility.description
    || `${facility.name}, ELEPEM en ${facility.locality}, ${facility.department}.`;
  return {
    title: { absolute: `Arandú | ${facility.name}` },
    description,
    alternates: { canonical: canonicalPath },
  };
}

export default async function FacilityPage({ params }: FacilityPageProps) {
  const { codigo } = await params;
  const resolved = await resolvePublicFacilityRoute(codigo);
  if (!resolved) notFound();
  if (`/elepem/${codigo}` !== resolved.canonicalPath) permanentRedirect(resolved.canonicalPath);

  const { facility } = resolved;
  return <article className="facilityPermanentPage">
    <header className="facilityPermanentHeader">
      <Link href="/" className="facilityPermanentBack">
        <ArrowLeft size={19} aria-hidden="true" />Volver a resultados
      </Link>
      <h1>{facility.name}</h1>
      <p>{facility.address || "Dirección no informada"}</p>
      <p>{facility.locality || "Localidad no informada"} · {facility.department}</p>
    </header>
    <div className="facilityPermanentContent">
      <FacilityProfile facility={facility} showConcernAction={false} showSources={false} />
    </div>
  </article>;
}
