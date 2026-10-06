import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/constants";
import { Header, Footer } from "@/components/header";
import "./scrollcraft.css";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://localhost:3000"),
  openGraph: {
    locale: "de_CH",
    type: "website",
    title: `${BRAND_NAME} · Autoteile weitergeben`,
    description: "Steht im Keller. Fehlt in der Garage.",
    images: [
      {
        url: "/landing/garage.webp",
        width: 1536,
        height: 1024,
        alt: "Teilebörse · Autoteile in der Schweiz",
      },
    ],
  },
  title: {
    default: `${BRAND_NAME} · Autoteile weitergeben`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Autoteile, Reifen, Felgen und Zubehör in der Schweiz tauschen, verschenken oder verkaufen.",
  robots: {
    index: process.env.BRAND_DOMAIN?.endsWith(".example") === false,
    follow: true,
  },
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>
        <a href="#main" className="skip-link">
          Zum Inhalt
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
