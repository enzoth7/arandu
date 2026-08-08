"use client";

import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sólo el mensaje y el digest: nunca el contenido de una comunicación.
    console.error("Error de ruta.", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="routeError" role="alert">
      <h2>Algo no funcionó</h2>
      <p>No pudimos mostrar esta sección. Podés intentar de nuevo.</p>
      <button className="notFoundHomeLink" type="button" onClick={reset}>Reintentar</button>
    </div>
  );
}
