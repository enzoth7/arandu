import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ExternalLink, TriangleAlert } from "lucide-react";
import { ChoosingGuideControls, type GuideTarget } from "../../components/ChoosingGuideControls";
import {
  OFFICIAL_CHOICE_GUIDE,
  OFFICIAL_CHOICE_GUIDE_SOURCE,
} from "../../../lib/official-choice-guide.mjs";
import styles from "./guide.module.css";

export const metadata: Metadata = {
  title: "Cómo elegir",
  description: "Guía oficial para elegir un centro de larga estadía en Uruguay.",
};

const GUIDE_TARGETS: readonly GuideTarget[] = [
  { id: "como-elegir", label: "Cómo elegir" },
  { id: "buenas-senales", label: "Buenas señales" },
  { id: "malas-senales", label: "Malas señales" },
];

function TextSection({
  id,
  title,
  paragraphs,
  open = false,
}: {
  id: string;
  title: string;
  paragraphs: readonly string[];
  open?: boolean;
}) {
  return <details className={styles.accordion} id={id} data-guide-section open={open}>
    <summary>
      <strong>{title}</strong>
      <ChevronDown size={22} aria-hidden="true" />
    </summary>
    <div className={styles.accordionBody}>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </div>
  </details>;
}

function SignalSection({
  id,
  title,
  signals,
  tone,
}: {
  id: string;
  title: string;
  signals: readonly string[];
  tone: "good" | "bad";
}) {
  const Icon = tone === "good" ? CheckCircle2 : TriangleAlert;

  return <details className={`${styles.accordion} ${styles[tone]}`} id={id} data-guide-section>
    <summary>
      <Icon size={23} aria-hidden="true" />
      <strong>{title}</strong>
      <small>{signals.length} señales</small>
      <ChevronDown size={22} aria-hidden="true" />
    </summary>
    <div className={styles.accordionBody}>
      <ol className={styles.signalList}>
        {signals.map((signal) => <li key={signal}><p>{signal}</p></li>)}
      </ol>
    </div>
  </details>;
}

export default function ChoosingGuidePage() {
  return <article className={styles.page}>
    <header className={styles.hero}>
      <h1>Informate primero. Visitá después.</h1>
      <p className={styles.lead}>Consultá qué tener en cuenta y después compará los ELEPEM que te interesen.</p>
      <ChoosingGuideControls targets={GUIDE_TARGETS} />
    </header>

    <section className={styles.accordionStack} aria-label="Contenido de la guía oficial">
      <TextSection
        id="antes-de-elegir"
        title="Antes de elegir"
        paragraphs={OFFICIAL_CHOICE_GUIDE.before}
        open
      />
      <TextSection id="que-son" title="¿Qué son los centros de larga estadía?" paragraphs={OFFICIAL_CHOICE_GUIDE.what} />
      <TextSection id="como-elegir" title="¿Cómo elegir?" paragraphs={OFFICIAL_CHOICE_GUIDE.how} />
      <SignalSection id="buenas-senales" title="Buenas señales" signals={OFFICIAL_CHOICE_GUIDE.goodSignals} tone="good" />
      <SignalSection id="malas-senales" title="Malas señales" signals={OFFICIAL_CHOICE_GUIDE.badSignals} tone="bad" />
    </section>

    <section className={styles.closing} aria-labelledby="guide-closing-title">
      <h2 id="guide-closing-title">{OFFICIAL_CHOICE_GUIDE.closing[2]}</h2>
      <p><strong>{OFFICIAL_CHOICE_GUIDE.closing[0]}</strong></p>
      <p>{OFFICIAL_CHOICE_GUIDE.closing[1]}</p>
      <p className={styles.contact}>{OFFICIAL_CHOICE_GUIDE.closing[3]}</p>
    </section>

    <aside className={styles.source} aria-labelledby="guide-source-title">
      <div>
        <h2 id="guide-source-title">Publicación original</h2>
        <p>Sistema de Cuidados, MIDES, Inmayores y Ministerio de Salud.</p>
      </div>
      <a href={OFFICIAL_CHOICE_GUIDE_SOURCE.url} target="_blank" rel="noreferrer">
        Ver publicación oficial <ExternalLink size={18} aria-hidden="true" />
      </a>
    </aside>

    <footer className={styles.endAction}>
      <h2>Ahora podés comparar opciones</h2>
      <Link href="/#mapa-registro">Explorar el registro de ELEPEM</Link>
    </footer>
  </article>;
}
