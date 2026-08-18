import type { Metadata } from "next";
import { IntakeReportForm } from "../../components/IntakeReportForm";
import { loadPublicFacilitiesOrEmpty } from "../../../lib/facility-registry";
import { canonicalDepartment, URUGUAY_DEPARTMENTS } from "../../../lib/uruguay.mjs";

export const metadata: Metadata = {
  title: "Comunicar una preocupación",
  description: "Contá una situación sobre vos o sobre otra persona mayor. La herramienta prepara una evaluación humana.",
};

export default async function PersonasDenunciaPage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const validDepartments = new Set(URUGUAY_DEPARTMENTS);
  const facilities = (await loadPublicFacilitiesOrEmpty())
    .map(({ id, name, locality, department }) => ({ id, name, locality, department: canonicalDepartment(department) }))
    .filter((facility) => validDepartments.has(facility.department))
    .sort((left, right) => left.name.localeCompare(right.name, "es-UY", { sensitivity: "base" }));
  return (
    <>
      <div style={{ 
        width: "min(1280px, calc(100% - 34px))",
        margin: "0 auto 18px",
        backgroundColor: "#fee2e2", 
        border: "1px solid #ef4444",
        borderRadius: "16px",
        color: "#b91c1c", 
        padding: "18px 22px", 
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "13px"
      }}>
        <strong>ADVERTENCIA:</strong> Arandú no es un servicio de emergencia. Ante un riesgo inmediato, se debe acudir al canal de emergencia correspondiente.
      </div>
      <div style={{ width: "100%", padding: "1rem" }}>
        <IntakeReportForm 
          facilities={facilities} 
          initialFacilityId={params.elepem || ""} 
          enabled={process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true"} 
        />
      </div>
    </>
  );
}
