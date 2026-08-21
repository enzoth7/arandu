import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAccess } from "../components/AccountAccess";
import { readAccountSession } from "../../lib/institutional-auth";

export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!await readAccountSession()) redirect("/recuperar-contrasena?error=enlace");
  return <AccountAccess mode="reset" />;
}
