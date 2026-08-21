import { redirect } from "next/navigation";

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value.slice(0, 500) : "/cuenta";
}

export default async function LegacyAccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  redirect(`/iniciar-sesion?next=${encodeURIComponent(next)}`);
}
