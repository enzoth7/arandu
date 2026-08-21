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
  const { facility, canonicalPath, publicCode } = resolved;
  const description = facility.description
    || `${facility.name}, ELEPEM en ${facility.locality}, ${facility.department}.`;
  return {
    title: `${facility.name} | ${publicCode}`,
    description,
    alternates: { canonical: canonicalPath },
  };
}

export default async function FacilityPage({ params }: FacilityPageProps) {
  const { codigo } = await params;
  const resolved = await resolvePublicFacilityRoute(codigo);
  if (!resolved) notFound();
  if (`/elepem/${codigo}` !== resolved.canonicalPath) permanentRedirect(resolved.canonicalPath);

  const { facility, publicCode } = resolved;
  return <article className="facilityPermanentPage">
    <header className="facilityPermanentHeader">
      <Link href="/" className="facilityPermanentBack">
        <ArrowLeft size={19} aria-hidden="true" />Volver a resultados
      </Link>
      <p className="facilityPermanentCode">{publicCode}</p>
      <h1>{facility.name}</h1>
      <p>{facility.address || "Dirección no informada"}</p>
      <p>{facility.locality || "Localidad no informada"} · {facility.department}</p>
    </header>
    <div className="facilityPermanentContent">
      <FacilityProfile facility={facility} />
    </div>
  </article>;
}
