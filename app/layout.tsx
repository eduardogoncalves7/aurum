import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/archivo/900.css";
import "@fontsource/archivo/700-italic.css";
import "@fontsource/archivo/900-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Aurum Detailing — Detalhamento automotivo premium",
  description:
    "Seu carro merece mais que uma lavagem. Monte seu orçamento de detalhamento automotivo premium com a Aurum Detailing.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Aurum Detailing",
    title: "Aurum Detailing — Detalhamento automotivo premium",
    description:
      "Seu carro merece mais que uma lavagem. Monte seu orçamento de detalhamento automotivo premium com a Aurum Detailing.",
    images: [{
      url: "/og-image.png",
      width: 1731,
      height: 909,
      type: "image/png",
      alt: "Aurum Detailing — marca dourada ao lado de um carro em lavagem na oficina",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurum Detailing — Detalhamento automotivo premium",
    description:
      "Seu carro merece mais que uma lavagem. Monte seu orçamento de detalhamento automotivo premium com a Aurum Detailing.",
    images: [{
      url: "/og-image.png",
      alt: "Aurum Detailing — marca dourada ao lado de um carro em lavagem na oficina",
    }],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
