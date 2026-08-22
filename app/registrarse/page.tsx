import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAccess } from "../components/AccountAccess";
import { readAccountSession } from "../../lib/institutional-auth";
import { listFacilityOptions } from "../../lib/role-workflows-db";

export const metadata: Metadata = { title: "Registrarte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (await readAccountSession()) redirect("/cuenta");
  const facilities = await listFacilityOptions();
  return <AccountAccess mode="register" invalidLink={params.error === "enlace"} facilities={facilities} />;
}

