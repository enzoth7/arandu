import type { Metadata } from "next";
import { PrototypePriceDirectory } from "../../components/PrototypePriceDirectory";
import { loadPrototypePriceGuidanceOrEmpty } from "../../../lib/prototype-price-guidance-registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Precios orientativos de ELEPEM | Arandú",
  description: "Rangos mensuales orientativos para las fichas del padrón Arandú, diferenciando precios públicos de estimaciones de prototipo.",
};

export default async function PrototypePricesPage() {
  const guidance = await loadPrototypePriceGuidanceOrEmpty();
  return <PrototypePriceDirectory initialGuidance={guidance} />;
}
