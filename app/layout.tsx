import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// `globals.css` pedía Inter pero nadie la cargaba, así que en la práctica caía
// siempre a la tipografía del sistema. next/font la sirve desde el mismo origen
// y reserva las métricas, con lo que no hay salto de maquetado.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Arandú | Información para elegir",
    template: "%s | Arandú",
  },
  description: "Información clara sobre ELEPEM en Uruguay.",
  applicationName: "Arandú",
  icons: {
    icon: "/arandu-mark.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: "Arandú",
    title: "Arandú | Información para elegir",
    images: ["/arandu-hero-v2.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#153f3b",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
