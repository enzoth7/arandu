import type { ReactNode } from "react";
import { PortalChrome } from "../../components/PortalChrome";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";

export default async function StateLayout({ children }: { children: ReactNode }) {
  await requireInstitutionalRole("state");
  return <PortalChrome portal="state">{children}</PortalChrome>;
}
