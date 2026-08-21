import Image from "next/image";
import Link from "next/link";
import { loadAssignedFacilityProfiles } from "../../../lib/facility-registry";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";

export default async function FacilityHomePage() {
  const session = await requireInstitutionalRole("facility_representative");
  const facilities = await loadAssignedFacilityProfiles(session.facilityIds);

  return (
    <section className="institutionalWorkspace">
      <header className="institutionalPageHeader">
        <div>
          <h1>Mis ELEPEM</h1>
          <p>Consultá los datos registrados y proponé actualizaciones para revisión institucional.</p>
        </div>
      </header>
      <div className="demoFacilityGrid">
        {facilities.map((facility) => (
          <article className="demoFacilityCard" key={facility.id}>
            <div className={`demoFacilityImage${(facility.imageUrls?.length || 0) > 1 ? " hasGallery" : ""}`}>
              {(facility.imageUrls?.length ? facility.imageUrls : [facility.imageUrl]).map((imageUrl, index) => (
                <Image
                  src={imageUrl}
                  alt={index === 0 ? facility.imageAlt : `Foto pública ${index + 1} de ${facility.name}`}
                  width={720}
                  height={420}
                  sizes="(max-width: 760px) 100vw, 33vw"
                  unoptimized={imageUrl.startsWith("/api/")}
                  key={imageUrl}
                />
              ))}
            </div>
            <div className="demoFacilityBody">
              <h2>{facility.name}</h2>
              <p>{facility.description}</p>
              <div className="facilityPortalActions">
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
