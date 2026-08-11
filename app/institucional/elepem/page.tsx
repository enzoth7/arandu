import Image from "next/image";
import Link from "next/link";
import { loadAssignedFacilityProfiles } from "../../../lib/facility-registry";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";

export default async function FacilityHomePage() {
  const session = await requireInstitutionalRole("facility");
  const facilities = await loadAssignedFacilityProfiles(session.facilityIds);

  return (
    <section className="institutionalWorkspace">
      <header className="institutionalPageHeader">
        <div>
          <h1>Mis ELEPEM</h1>
          <p>Consultá la ficha pública y proponé actualizaciones para revisión institucional.</p>
        </div>
      </header>
      <div className="demoFacilityGrid">
        {facilities.map((facility) => (
          <article className="demoFacilityCard" key={facility.id}>
            <div className="demoFacilityImage">
              <Image src={facility.imageUrl} alt={facility.imageAlt} fill sizes="(max-width: 760px) 100vw, 33vw" />
            </div>
            <div className="demoFacilityBody">
              <h2>{facility.name}</h2>
              <p>{facility.description}</p>
              <div className="facilityPortalActions">
                <Link href={`/?elepem=${encodeURIComponent(facility.id)}`} className="reportBack">Ver ficha pública</Link>
                <Link href={`/institucional/elepem/solicitudes/nueva?elepem=${encodeURIComponent(facility.id)}`} className="reportContinue">Proponer un cambio</Link>
              </div>
            </div>
          </article>
        ))}
        {facilities.length === 0 && (
          <p className="registryEmptyResults">No hay ELEPEM asignados a esta cuenta.</p>
        )}
      </div>
    </section>
  );
}
