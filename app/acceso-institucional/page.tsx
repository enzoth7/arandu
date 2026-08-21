import { redirect } from "next/navigation";
import { institutionalHome, readAccountSession } from "../../lib/institutional-auth";

export default async function LegacyInstitutionalAccessPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta");
  if (!account.institutional) redirect("/cuenta");
  redirect(institutionalHome(account.institutional.role));
}
