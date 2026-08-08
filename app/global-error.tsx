"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="routeError" role="alert">
          <h2>La aplicación no pudo cargarse</h2>
          <p>Ocurrió un error inesperado{error.digest ? ` (referencia ${error.digest})` : ""}.</p>
          <button className="notFoundHomeLink" type="button" onClick={reset}>Reintentar</button>
        </div>
      </body>
    </html>
  );
}
