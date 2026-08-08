import type { MetadataRoute } from "next";
import { pathFor, personNavItems } from "./components/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = [
    "/",
    ...personNavItems.map((item) => pathFor("person", item.view)),
    "/personas/residenciales/form",
  ];
  return [...new Set(publicPaths)].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
