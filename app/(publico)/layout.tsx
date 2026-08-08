import type { ReactNode } from "react";
import { PortalChrome } from "../components/PortalChrome";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PortalChrome portal="public">{children}</PortalChrome>;
}
