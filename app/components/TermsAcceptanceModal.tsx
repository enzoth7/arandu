"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FileText, ShieldAlert } from "lucide-react";

export function TermsAcceptanceModal({ open }: { open: boolean }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleConfirm() {
    if (!accepted) {
      setError("Debés marcar la casilla de aceptación para continuar.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/account/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error || "No pudimos registrar tu confirmación. Volvé a intentarlo.");
        return;
      }
      router.refresh();
    } catch {
      setError("Ocurrió un problema de conexión al confirmar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog open className="appModal termsModalDialog" aria-modal="true" aria-labelledby="terms-modal-title">
      <div className="appModalBody termsModalBody">
        <div className="termsModalHeader">
          <div className="termsModalIcon" aria-hidden="true">
            <FileText size={28} />
          </div>
          <div>
            <p className="eyebrow">Piloto Arandú</p>
            <h2 id="terms-modal-title">Términos y condiciones</h2>
          </div>
        </div>

        <aside className="aranduDemoBanner termsBanner" aria-label="Aviso del prototipo">
          <ShieldAlert size={20} aria-hidden="true" />
          <p>
            Para continuar usando tu cuenta en el piloto es necesario que confirmes la lectura y aceptación de los Términos y Condiciones vigentes.
          </p>
        </aside>

        <div className="termsNoticeCard termsModalCard">
          <label htmlFor="terms-modal-checkbox" className="termsCheckboxLabel">
            <input
              id="terms-modal-checkbox"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              required
            />
            <span>
              Antes de continuar por favor lee nuestros{" "}
              <Link href="/terminos" target="_blank" rel="noopener noreferrer" className="termsLink">
                Términos y Condiciones
              </Link>
              , aceptalos y presiona confirmar.
            </span>
          </label>
        </div>

        {error && <p className="accessLoginError" role="alert">{error}</p>}

        <div className="termsModalActions">
          <button
            type="button"
            className="accessLoginSubmit termsConfirmBtn"
            onClick={handleConfirm}
            disabled={submitting || !accepted}
          >
            {submitting ? "Confirmando…" : "Confirmar y continuar"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
