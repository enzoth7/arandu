import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      // El portal de organización y las APIs no se indexan.
      disallow: ["/organizacion/", "/institucional/", "/acceso-institucional", "/api/"],
    }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
