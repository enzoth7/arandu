import type { Metadata } from "next";
import { ReportStatusLookup } from "../../components/ReportStatusLookup";

export const metadata: Metadata = {
  title: "Seguimiento",
  description: "Ingresá tu código de seguimiento y comprobá en qué estado está la comunicación que enviaste.",
};

export default async function PersonasSeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  return <ReportStatusLookup initialCode={codigo ?? ""} />;
}
