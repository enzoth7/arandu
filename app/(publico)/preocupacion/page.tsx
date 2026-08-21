import { redirect } from "next/navigation";

export default async function ConcernRedirectPage({ searchParams }: { searchParams: Promise<{ elepem?: string }> }) {
  const params = await searchParams;
  const facility = typeof params.elepem === "string" ? params.elepem.trim() : "";
  redirect(facility ? `/experiencia?elepem=${encodeURIComponent(facility)}` : "/experiencia");
}
