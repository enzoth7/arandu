"use client";

import { Eye, EyeOff, Printer } from "lucide-react";
import styles from "../(publico)/guia/guide.module.css";

export type GuideTarget = Readonly<{
  id: string;
  label: string;
}>;

function guideSections() {
  return Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-guide-section]"));
}

export function ChoosingGuideControls({ targets }: { targets: readonly GuideTarget[] }) {
  const setAll = (open: boolean) => {
    guideSections().forEach((section) => {
      if (open) section.setAttribute("open", "");
      else section.removeAttribute("open");
    });
  };

  const goToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!(section instanceof HTMLDetailsElement)) return;

    section.open = true;
    window.requestAnimationFrame(() => {
      const summary = section.querySelector("summary");
      summary?.focus({ preventScroll: true });
      section.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const controlledSections = targets.map((target) => target.id).join(" ");

  return <section className={styles.tools} aria-labelledby="guide-index-title">
    <div className={styles.indexBlock}>
      <h2 id="guide-index-title">En esta guía</h2>
      <nav aria-label="Secciones de la guía">
        <ol className={styles.indexList}>
          {targets.map((target) => <li key={target.id}>
            <button type="button" onClick={() => goToSection(target.id)} aria-controls={target.id}>
              {target.label}
            </button>
          </li>)}
        </ol>
      </nav>
    </div>

    <div className={styles.toolActions} aria-label="Controles de lectura">
      <button type="button" onClick={() => setAll(true)} aria-controls={controlledSections}>
        <Eye size={18} aria-hidden="true" /> Mostrar todo
      </button>
      <button type="button" onClick={() => setAll(false)} aria-controls={controlledSections}>
        <EyeOff size={18} aria-hidden="true" /> Ocultar todo
      </button>
      <button type="button" onClick={() => window.print()}>
        <Printer size={18} aria-hidden="true" /> Imprimir
      </button>
    </div>
  </section>;
}
