import type { MetadataRoute } from "next";
import { loadPublicFacilitiesOrEmpty } from "../lib/facility-registry";
import { publicFacilityPath } from "../lib/public-facility-code.mjs";
import { pathFor, publicNavItems } from "./components/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = publicNavItems.map((item) => pathFor("public", item.view));
  const facilities = await loadPublicFacilitiesOrEmpty();
  const publicPaths = facilities.flatMap((facility) => (
    facility.registryId ? [publicFacilityPath(facility.registryId)] : []
  ));
  return [...new Set([...paths, ...publicPaths])].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path.startsWith("/elepem/") ? 0.8 : 0.7,
  }));
}
