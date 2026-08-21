import { redirect } from "next/navigation";
export default function LegacyOrganizationLoginPage() { redirect("/iniciar-sesion?next=/cuenta"); }
