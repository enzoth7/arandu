import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notFoundPage">
      <h2>Página no encontrada</h2>
      <p>La página que buscás no existe o fue movida.</p>
      <Link href="/" className="notFoundHomeLink">Volver al inicio</Link>
    </div>
  );
}
