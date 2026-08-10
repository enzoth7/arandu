import type { ReactNode } from "react";
import { PortalChrome } from "../../components/PortalChrome";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
export default async function FacilityLayout({ children }: { children: ReactNode }) { await requireInstitutionalRole("facility"); return <PortalChrome portal="facility">{children}</PortalChrome>; }
