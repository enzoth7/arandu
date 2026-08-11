import { FacilityChangeForm } from "../../../../components/institutional/FacilityChangeForm";
import { loadAssignedFacilityProfiles } from "../../../../../lib/facility-registry";
import { requireInstitutionalRole } from "../../../../../lib/institutional-auth";

export default async function NewFacilityChangePage() {
  const session = await requireInstitutionalRole("facility");
  const facilities = await loadAssignedFacilityProfiles(session.facilityIds);
  const enabled = process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true";
  return <FacilityChangeForm facilities={facilities} enabled={enabled} />;
}
