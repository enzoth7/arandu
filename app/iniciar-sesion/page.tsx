import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAccess } from "../components/AccountAccess";
import { readAccountSession } from "../../lib/institutional-auth";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value.slice(0, 500) : "/cuenta";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await readAccountSession()) redirect(next);
  return <AccountAccess mode="login" next={next} invalidLink={params.error === "enlace"} />;
}
