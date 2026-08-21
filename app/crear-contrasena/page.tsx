import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAccess } from "../components/AccountAccess";
import { readAccountSession } from "../../lib/institutional-auth";

export const metadata: Metadata = { title: "Crear contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CreatePasswordPage() {
  if (!await readAccountSession()) redirect("/registrarse?error=enlace");
  return <AccountAccess mode="password" />;
}
