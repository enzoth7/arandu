import Image from "next/image";
import Link from "next/link";
import { DEMO_FACILITIES } from "../../lib/demo-facilities";

export function DemoFacilityGallery() {
  return <section className="demoFacilitySection" aria-labelledby="demo-facilities-title">
    <div className="demoFacilityHeader">
      <div>
        <span className="demoPermanentBadge">Datos ficticios</span>
        <h2 id="demo-facilities-title">Perfiles para ensayar la experiencia</h2>
        <p>Estos tres ejemplos no pertenecen al padrón real, no tienen coordenadas y nunca aparecen en los resultados del mapa.</p>
      </div>
      <Link href="/experiencia" className="reportContinue">Compartir una experiencia ficticia</Link>
    </div>

    <div className="demoFacilityGrid">
      {DEMO_FACILITIES.map((facility) => <article className="demoFacilityCard" key={facility.id}>
        <div className="demoFacilityImage">
          <Image src={facility.imageUrl} alt={facility.imageAlt} fill sizes="(max-width: 800px) 100vw, 33vw" />
          <span className="demoPermanentBadge">Datos ficticios</span>
        </div>
        <div className="demoFacilityBody">
          <small>{facility.id}</small>
          <h3>{facility.name}</h3>
          <p>{facility.description}</p>
          <dl>
            <div><dt>Ubicación</dt><dd>{facility.locality} · {facility.department}</dd></div>
            <div><dt>Contacto</dt><dd>{facility.phone}<br />{facility.email}</dd></div>
            <div><dt>Precio mensual</dt><dd>Desde $ {facility.monthlyPriceFromUyu.toLocaleString("es-UY")} UYU</dd></div>
            <div><dt>Incluye</dt><dd>{facility.priceIncludes.join(", ")}</dd></div>
            <div><dt>Fecha del precio</dt><dd>{new Date(`${facility.priceVerifiedAt}T12:00:00Z`).toLocaleDateString("es-UY")}</dd></div>
          </dl>
          <p className="demoFacilityNote">Foto sintética sin personas. Nombre, dirección, contacto y precio inventados para la demostración.</p>
          <Link className="reportBack" href={`/experiencia?elepem=${facility.id}`}>Usar en experiencia demo</Link>
        </div>
      </article>)}
    </div>
  </section>;
}
