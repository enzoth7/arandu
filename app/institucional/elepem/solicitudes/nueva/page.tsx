import { FacilityChangeForm } from "../../../../components/institutional/FacilityChangeForm";
import { loadAssignedFacilityProfiles } from "../../../../../lib/facility-registry";
import { requireInstitutionalRole } from "../../../../../lib/institutional-auth";

export default async function NewFacilityChangePage() {
  const session = await requireInstitutionalRole("facility_representative");
  const facilities = await loadAssignedFacilityProfiles(session.facilityIds);
  return <FacilityChangeForm facilities={facilities} />;
}
