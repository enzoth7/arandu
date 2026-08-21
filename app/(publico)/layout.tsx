import type { ReactNode } from "react";
import { PortalChrome } from "../components/PortalChrome";
import { PublicScrollReset } from "../components/PublicScrollReset";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PortalChrome portal="public"><PublicScrollReset />{children}</PortalChrome>;
}
