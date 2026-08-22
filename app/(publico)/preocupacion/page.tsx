import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileText,
  Headphones,
  Info,
  Mail,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";

import styles from "./concern.module.css";

export const metadata: Metadata = {
  title: "Orientación ante situaciones de preocupación — Arandú",
  description:
    "Datos y canales publicados por organismos oficiales (MIDES, MSP, Inmayores, Cuidados) ante situaciones de preocupación o emergencia en ELEPEM de Uruguay.",
};

export default function ConcernPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topNav}>
          <Link className={styles.backLink} href="/experiencia">
            <ArrowLeft size={16} aria-hidden="true" /> Volver a Compartir una experiencia
          </Link>
        </div>

        {/* Hero Banner */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>INFORMACIÓN EXTERNA</p>
            <h1 className={styles.heroTitle}>
              Orientación ante situaciones de preocupación
            </h1>
            <p className={styles.heroDescription}>
              Consultá los datos publicados por organismos oficiales según la necesidad. La elección del canal y el contacto se realizan fuera de Arandú.
            </p>
          </div>
          <div className={styles.heroSideBox}>
            <div className={styles.heroSideIcon}>
              <Info size={20} aria-hidden="true" />
            </div>
            <div>
              <strong>Arandú no recibe, guarda, evalúa ni deriva denuncias.</strong>
              <p>Los botones de esta sección abren canales externos y oficiales.</p>
            </div>
          </div>
        </section>

        {/* Emergency Banner */}
        <section className={styles.emergencyCard}>
          <div className={styles.emergencyLeft}>
            <div className={styles.emergencyBadge}>
              <AlertTriangle size={15} aria-hidden="true" />
              <span>EMERGENCIA</span>
            </div>
            <h2 className={styles.emergencyTitle}>¿Hay una persona en riesgo inmediato?</h2>
            <p className={styles.emergencyText}>
              9-1-1: llamada gratuita, incluso sin saldo, disponible las 24 horas. También está disponible la App 9-1-1.
            </p>
          </div>
          <div className={styles.emergencyActions}>
            <a href="tel:911" className={styles.emergencyCallBtn}>
              Llamar al 9-1-1
            </a>
            <a
              href="https://www.gub.uy/ministerio-interior/politicas-y-gestion/app-emergencia-9-1-1"
              target="_blank"
              rel="noreferrer"
              className={styles.emergencyAppBtn}
            >
              Ver App 9-1-1
            </a>
          </div>
        </section>

        {/* Section Header */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Canales oficiales</h2>
          <p className={styles.sectionSubtitle}>
            Elegí el canal que corresponda y realizá el contacto directamente con el organismo. No es necesario dejar información adicional en Arandú.
          </p>
        </div>

        {/* Grid of Official Channels */}
        <div className={styles.channelsGrid}>
          {/* Card 1: Inmayores */}
          <article className={styles.channelCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconBox}>
                <Shield size={22} aria-hidden="true" />
              </div>
              <span className={styles.cardTag}>• MIDES • INMAYORES</span>
            </div>
            <h3 className={styles.cardHeading}>Abuso o maltrato a persona mayor</h3>
            <p className={styles.cardSummary}>
              Canal de orientación y atención de Inmayores ante situaciones de abuso o maltrato.
            </p>
            <div className={styles.cardDetails}>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>
                  <a href="tel:24000302">2400 0302</a>, internos 7551 y 7552 · <a href="tel:098846943">098 846 943</a>
                </span>
              </div>
              <div className={styles.detailRow}>
                <MapPin size={16} className={styles.detailIcon} />
                <span>Mercedes 1227 · lunes a viernes, 9:00 a 15:00</span>
              </div>
              <div className={styles.detailRow}>
                <Mail size={16} className={styles.detailIcon} />
                <div className={styles.emailLinks}>
                  <a href="mailto:servicioinmayores@mides.gub.uy">servicioinmayores@mides.gub.uy</a>
                  <a href="mailto:accionesinmayores@mides.gub.uy">accionesinmayores@mides.gub.uy</a>
                </div>
              </div>
            </div>

            <div className={styles.warningBox}>
              <strong>Pendiente antes de producción:</strong> las páginas oficiales publican dos correos distintos. Confirmar con Inmayores cuál corresponde fijar.
            </div>

            <div className={styles.cardActions}>
              <a
                href="https://www.gub.uy/tramites/servicio-orientacion-atencion-situaciones-abuso-maltrato-hacia-personas-mayores"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryActionBtn}
              >
                Abrir trámite oficial
              </a>
              <a
                href="https://www.gub.uy/ministerio-desarrollo-social/inmayores"
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryActionBtn}
              >
                Ver contacto publicado
              </a>
            </div>
          </article>

          {/* Card 2: MSP Atención al Usuario */}
          <article className={styles.channelCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconBox}>
                <FileText size={22} aria-hidden="true" />
              </div>
              <span className={styles.cardTag}>• MSP • ATENCIÓN AL USUARIO</span>
            </div>
            <h3 className={styles.cardHeading}>Consulta, denuncia o reclamo de usuario</h3>
            <p className={styles.cardSummary}>
              Canal del MSP para consultas, denuncias, reclamos o sugerencias vinculadas con instituciones de salud.
            </p>
            <div className={styles.cardDetails}>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>
                  <a href="tel:1934">1934</a>, internos 5023 y 5026
                </span>
              </div>
              <div className={styles.detailRow}>
                <Mail size={16} className={styles.detailIcon} />
                <a href="mailto:atencionalusuario@msp.gub.uy">atencionalusuario@msp.gub.uy</a>
              </div>
            </div>

            <div className={styles.noteBox}>
              Confirmar que el asunto corresponde al ámbito sanitario.
            </div>

            <div className={styles.cardActions}>
              <a
                href="https://www.gub.uy/tramites/consultas-denuncias-reclamos-sugerencias-presentadas-ante-atencion-usuario"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryActionBtn}
              >
                Iniciar trámite oficial
              </a>
            </div>
          </article>

          {/* Card 3: MSP Fiscalización */}
          <article className={styles.channelCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconBox}>
                <Building2 size={22} aria-hidden="true" />
              </div>
              <span className={styles.cardTag}>• MSP • FISCALIZACIÓN</span>
            </div>
            <h3 className={styles.cardHeading}>Fiscalización sanitaria</h3>
            <p className={styles.cardSummary}>
              Para planteos relacionados con el cumplimiento de disposiciones sanitarias.
            </p>
            <div className={styles.cardDetails}>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>
                  <a href="tel:1934">1934</a>, internos 4210, 4220, 1156 o 2260
                </span>
              </div>
              <div className={styles.detailRow}>
                <Mail size={16} className={styles.detailIcon} />
                <a href="mailto:consultasfiscalizacion@msp.gub.uy">consultasfiscalizacion@msp.gub.uy</a>
              </div>
            </div>

            <div className={styles.noteBox}>
              Para irregularidades sanitarias. Arandú no promete resultado ni plazo de respuesta.
            </div>

            <div className={styles.cardActions}>
              <a
                href="https://www.gub.uy/ministerio-salud-publica"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryActionBtn}
              >
                Ver canal oficial
              </a>
            </div>
          </article>

          {/* Card 4: MSP Sector ELEPEM */}
          <article className={styles.channelCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconBox}>
                <FileText size={22} aria-hidden="true" />
              </div>
              <span className={styles.cardTag}>• MSP • SECTOR ELEPEM</span>
            </div>
            <h3 className={styles.cardHeading}>Habilitación o registro de ELEPEM</h3>
            <p className={styles.cardSummary}>
              Para consultas administrativas y documentación del establecimiento.
            </p>
            <div className={styles.cardDetails}>
              <div className={styles.detailRow}>
                <MapPin size={16} className={styles.detailIcon} />
                <span>Av. 18 de Julio 1892, 3.er piso, oficina 314 · lunes a viernes, 9:00 a 15:00</span>
              </div>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>
                  <a href="tel:1934">1934</a>, internos 1133, 1081 y 1150
                </span>
              </div>
              <div className={styles.detailRow}>
                <Mail size={16} className={styles.detailIcon} />
                <a href="mailto:elepem2020@msp.gub.uy">elepem2020@msp.gub.uy</a>
              </div>
            </div>

            <div className={styles.noteBox}>
              Usar para consultas administrativas y documentación del establecimiento.
            </div>

            <div className={styles.cardActions}>
              <a
                href="https://www.gub.uy/tramites/habilitacion-establecimientos-larga-estadia-para-personas-mayores-elepem"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryActionBtn}
              >
                Ver canal oficial
              </a>
            </div>
          </article>

          {/* Card 5: Sistema de Cuidados */}
          <article className={styles.channelCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconBox}>
                <Headphones size={22} aria-hidden="true" />
              </div>
              <span className={styles.cardTag}>• SISTEMA DE CUIDADOS</span>
            </div>
            <h3 className={styles.cardHeading}>Orientación sobre cuidados</h3>
            <p className={styles.cardSummary}>
              Canal general para consultas vinculadas con servicios, apoyos y prestaciones de cuidados.
            </p>
            <div className={styles.cardDetails}>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>
                  <a href="tel:08001811">0800 1811</a> · <a href="tel:*1811">*1811</a> desde celular Antel
                </span>
              </div>
            </div>

            <div className={styles.noteBox}>
              Canal general: no sustituye una emergencia ni una denuncia ante el organismo competente.
            </div>

            <div className={styles.cardActions}>
              <a
                href="https://www.gub.uy/sistema-cuidados"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryActionBtn}
              >
                Ver canal oficial
              </a>
            </div>
          </article>
        </div>

        {/* Footer Disclaimer */}
        <aside className={styles.bottomDisclaimer}>
          <Info size={20} className={styles.disclaimerIcon} aria-hidden="true" />
          <p>
            Estos contactos se muestran como una derivación informativa. Antes de publicar la aplicación en producción, el equipo debe volver a comprobar teléfonos, internos, horarios, correos y enlaces oficiales.
          </p>
        </aside>
      </div>
    </main>
  );
}
