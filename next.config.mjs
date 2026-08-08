import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Anclar la raíz de trazado al repositorio. Sin esto, Next infiere la raíz por
// el lockfile más cercano hacia arriba y puede elegir un directorio externo,
// rompiendo las rutas relativas de `outputFileTracingIncludes`.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const isDevelopment = process.env.NODE_ENV === "development";

// Orígenes que la aplicación necesita de verdad:
// - teselas y atribución de OpenStreetMap para los dos mapas Leaflet;
// - Supabase (REST, Edge Functions y Storage) para altas y evidencia;
// - Vercel Analytics.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Leaflet escribe estilos en línea al posicionar el mapa y los marcadores.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
  // Vercel Analytics carga su script en los dos entornos (en desarrollo usa la
  // variante .debug), así que su origen va siempre. Next inyecta además el
  // arranque en línea, y en desarrollo necesita eval para el HMR.
  isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  distDir: process.env.ALERTAMAYOR_NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/team/facility-candidates/unlocated": [
      "./data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json",
      "./data/discovery/instagram_paysandu_candidates_2026-08-02.json",
      "./data/discovery/manual-ide-geocoding-2026-08-02.json",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
