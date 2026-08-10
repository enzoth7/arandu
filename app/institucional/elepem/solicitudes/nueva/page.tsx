import { DEMO_FACILITIES } from "../../../../../lib/demo-facilities";
import { requireInstitutionalRole } from "../../../../../lib/institutional-auth";
import { FacilityChangeForm } from "../../../../components/institutional/FacilityChangeForm";
export default async function NewFacilityChangePage() { const session = await requireInstitutionalRole("facility"); const facilities = DEMO_FACILITIES.filter((facility) => session.facilityIds.includes(facility.id)); const enabled = process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true"; return <FacilityChangeForm facilities={[...facilities]} enabled={enabled} />; }
