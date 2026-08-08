import type { ReactNode } from "react";
import { PortalChrome } from "../components/PortalChrome";

export default function PersonasLayout({ children }: { children: ReactNode }) {
  return <PortalChrome portal="person">{children}</PortalChrome>;
}
