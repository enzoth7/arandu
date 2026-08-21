import type { ReactNode } from "react";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { PortalChrome } from "../../components/PortalChrome";

// El control de sesión vive en el layout del grupo de rutas, así que ninguna
// página de organización puede olvidarlo. `/organizacion/login` queda fuera de
// este grupo a propósito, para no provocar un bucle de redirección.
export default async function OrganizacionProtegidoLayout({ children }: { children: ReactNode }) {
  await requireInstitutionalRole("administrator");
  return <PortalChrome portal="state">{children}</PortalChrome>;
}
