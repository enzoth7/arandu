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
    default: "Más Cerca · Información para decidir",
    template: "%s · Más Cerca",
  },
  description: "Más Cerca · Información para decidir.",
  applicationName: "Más Cerca",
  icons: {
    icon: "/mascerca.png",
    apple: "/mascerca.png",
  },
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: "Más Cerca",
    images: ["/mascerca.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#155eef",
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
