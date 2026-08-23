import type { ReactNode } from "react";
import { PortalChrome } from "../../components/PortalChrome";

export default function RequestRepresentationLayout({ children }: { children: ReactNode }) { 
    return <PortalChrome portal="facility">{children}</PortalChrome>; 
}