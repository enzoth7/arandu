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
const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || "https://itolluaivfoxnaohbsdk.supabase.co",
);
const supabaseOrigin = supabaseUrl.origin;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Leaflet escribe estilos en línea al posicionar el mapa y los marcadores.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://*.supabase.co https://*.tile.openstreetmap.org`,
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co https://nominatim.openstreetmap.org https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
  "frame-src 'self' https://www.openstreetmap.org",
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
  // Desarrollo y producción no pueden escribir en el mismo directorio: ejecutar
  // `next build` con `next dev` abierto reemplaza chunks que el servidor local
  // todavía tiene en memoria y deja las rutas respondiendo 500 hasta reiniciarlo.
  // La variable sigue permitiendo aislar compilaciones auxiliares cuando haga falta.
  distDir: process.env.ARANDU_NEXT_DIST_DIR || (isDevelopment ? ".next-dev" : ".next"),
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.slice(0, -1),
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/intake-evidence/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Rutas anteriores a la reestructuración hacia ELEPEM. Se resuelven acá y no
  // con páginas de redirección: no cargan React ni suman nada al bundle.
  async redirects() {
    const permanent = true;
    return [
      { source: "/personas", destination: "/", permanent },
      { source: "/personas/residenciales", destination: "/", permanent },
      { source: "/personas/residenciales/form", destination: "/guia", permanent },
      { source: "/personas/denuncia", destination: "/preocupacion", permanent },
      { source: "/personas/seguimiento", destination: "/seguimiento", permanent },
      { source: "/personas/fuentes", destination: "/fuentes", permanent },
      // La agenda de actividades sale del producto público.
      { source: "/personas/actividades", destination: "/", permanent },
      { source: "/residenciales", destination: "/", permanent },
      { source: "/login", destination: "/acceso-institucional", permanent },
      { source: "/organizacion/login", destination: "/acceso-institucional", permanent },
      { source: "/organizacion/residenciales", destination: "/institucional/estado/elepem", permanent },
      { source: "/organizacion/equipos", destination: "/institucional/estado/bandeja", permanent },
      { source: "/organizacion/review", destination: "/institucional/estado/bandeja?tipo=experience", permanent },
      { source: "/organizacion/fuentes", destination: "/institucional/estado/fuentes", permanent },
      { source: "/organizacion", destination: "/institucional/estado", permanent },
    ];
  },
};

export default nextConfig;
