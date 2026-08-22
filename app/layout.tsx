import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { AuthHashListener } from "./components/AuthHashListener";
import "leaflet/dist/leaflet.css";
import "./globals.css";


const merriweatherSans = localFont({
  src: [
    {
      path: "../public/Tipografías/web/MerriweatherSans-Latin-Variable.woff2",
      style: "normal",
      weight: "300 800",
    },
    {
      path: "../public/Tipografías/web/MerriweatherSans-Latin-Italic-Variable.woff2",
      style: "italic",
      weight: "300 800",
    },
  ],
  display: "swap",
  variable: "--font-merriweather-sans",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
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
    icon: [{ url: "/arandu-mark.svg?v=20260821", type: "image/svg+xml" }],
    shortcut: [{ url: "/arandu-mark.svg?v=20260821", type: "image/svg+xml" }],
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
  themeColor: "#123b67",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="es" className={merriweatherSans.variable}>
      <body>
        <AuthHashListener />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

