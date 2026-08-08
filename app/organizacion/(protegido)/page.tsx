import { redirect } from "next/navigation";
import { ORGANIZATION_HOME } from "../../components/navigation";

export default function OrganizacionIndexPage() {
  redirect(ORGANIZATION_HOME);
}
