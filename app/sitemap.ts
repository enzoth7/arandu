import type { MetadataRoute } from "next";
import { pathFor, publicNavItems } from "./components/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = publicNavItems.map((item) => pathFor("public", item.view));
  return [...new Set(paths)].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
