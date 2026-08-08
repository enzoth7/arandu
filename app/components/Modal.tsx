"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal sobre el elemento nativo `<dialog>`.
 *
 * Usar la plataforma en vez de un `<div>` con `onClick` trae gratis y bien
 * hechas la trampa de foco, el cierre con Escape, el `aria-modal` implícito y la
 * devolución del foco al elemento que lo abrió. El backdrop es `::backdrop`, así
 * que tampoco hace falta un div de fondo que capture clics.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // `close` cubre Escape y cualquier cierre nativo.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Clic fuera del contenido: el propio <dialog> ocupa toda la pantalla, así que
  // un clic directo sobre él (y no sobre su contenido) equivale al backdrop.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`appModal ${className}`.trim()}
      onClick={handleClick}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : title}
    >
      <div className="appModalBody">
        <button type="button" className="modalCloseBtn" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
