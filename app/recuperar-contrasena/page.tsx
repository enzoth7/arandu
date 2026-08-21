import type { Metadata } from "next";
import { AccountAccess } from "../components/AccountAccess";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AccountAccess mode="recover" invalidLink={params.error === "enlace"} />;
}
