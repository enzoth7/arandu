import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, ExternalLink, HeartHandshake, PhoneCall, ShieldAlert, ShieldCheck } from "lucide-react";
import styles from "./concern.module.css";

export const metadata: Metadata = {
  title: "Canales oficiales de consulta y orientación",
  description: "Canales oficiales de contacto con organismos públicos en Uruguay (MIDES, MSP, Sistema de Cuidados).",
};

export default function ConcernPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.backLink} href="/experiencia">
          <ArrowLeft size={18} aria-hidden="true" /> Volver al formulario de experiencia
        </Link>

        <header className={styles.header}>
          <div className={styles.iconBadge}>
            <Compass size={28} aria-hidden="true" />
          </div>
          <p className={styles.eyebrow}>ORIENTACIÓN Y PROTECCIÓN</p>
          <h1>Canales oficiales de consulta y orientación</h1>
          <p className={styles.lead}>
            Arandú no recibe ni tramita denuncias formales ni situaciones de urgencia médica. Si necesitás asesoramiento, realizar una consulta o plantear una situación ante los organismos reguladores de Uruguay, podés comunicarte directamente a través de estos canales públicos.
          </p>
        </header>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><PhoneCall size={24} /></span>
              <div>
                <h2>Sistema Nacional de Cuidados (MIDES)</h2>
                <p className={styles.cardBadge}>Línea gratuita nacional</p>
              </div>
            </div>
            <p className={styles.cardDescription}>
              Orientación personalizada sobre centros de larga estadía, derechos de las personas mayores y programas de cuidado.
            </p>
            <div className={styles.contactList}>
              <a href="tel:08001811" className={styles.phoneLink}>
                <strong>0800 1811</strong> <span>(gratuito desde teléfonos fijos)</span>
              </a>
              <a href="tel:*1811" className={styles.phoneLink}>
                <strong>*1811</strong> <span>(gratuito desde celulares Antel)</span>
              </a>
            </div>
            <small className={styles.cardFooter}>Lunes a viernes de 9:00 a 17:00 hs.</small>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><ShieldCheck size={24} /></span>
              <div>
                <h2>Ministerio de Salud Pública (MSP)</h2>
                <p className={styles.cardBadge}>Fiscalización sanitaria</p>
              </div>
            </div>
            <p className={styles.cardDescription}>
              Consultas y trámites vinculados a la habilitación higiénica, condiciones sanitarias y dirección técnica médica de los ELEPEM.
            </p>
            <div className={styles.contactList}>
              <a href="tel:1934" className={styles.phoneLink}>
                <strong>1934</strong> <span>(Central telefónica MSP)</span>
              </a>
              <a
                href="https://www.gub.uy/ministerio-salud-publica"
                target="_blank"
                rel="noreferrer"
                className={styles.externalLink}
              >
                Sitio oficial del MSP <ExternalLink size={15} />
              </a>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><HeartHandshake size={24} /></span>
              <div>
                <h2>Instituto Nacional de las Personas Mayores (Inmayores)</h2>
                <p className={styles.cardBadge}>Promoción y derechos</p>
              </div>
            </div>
            <p className={styles.cardDescription}>
              Atención psicosocial, información y protección de derechos para personas mayores en situación de vulnerabilidad.
            </p>
            <div className={styles.contactList}>
              <a href="tel:24000302" className={styles.phoneLink}>
                <strong>2400 0302</strong> <span>(interno 1811)</span>
              </a>
              <a
                href="https://www.gub.uy/ministerio-desarrollo-social/inmayores"
                target="_blank"
                rel="noreferrer"
                className={styles.externalLink}
              >
                Portal de Inmayores <ExternalLink size={15} />
              </a>
            </div>
          </article>

          <article className={`${styles.card} ${styles.emergencyCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.emergencyIcon}><ShieldAlert size={24} /></span>
              <div>
                <h2>Emergencias policiales y médicas</h2>
                <p className={styles.emergencyBadge}>Riesgo inminente</p>
              </div>
            </div>
            <p className={styles.cardDescription}>
              En caso de peligro inmediato, violencia física o emergencia de salud urgente que requiera auxilio instantáneo.
            </p>
            <div className={styles.contactList}>
              <a href="tel:911" className={styles.emergencyPhoneLink}>
                <strong>911</strong> <span>(Emergencias 24 hs en todo el país)</span>
              </a>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
