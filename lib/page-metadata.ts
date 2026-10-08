import type { Metadata } from "next";

export function pageMetadata(title: string, description: string, pathname: string): Metadata {
  const brandedTitle = `${title} | Aurum Detailing`;
  return {
    title: { absolute: brandedTitle },
    description,
    alternates: { canonical: pathname },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Aurum Detailing",
      title: brandedTitle,
      description,
      url: pathname,
      images: [{ url: "/og-image.png", width: 1731, height: 909, type: "image/png", alt: "Aurum Detailing — detalhamento automotivo" }],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [{ url: "/og-image.png", alt: "Aurum Detailing — detalhamento automotivo" }],
    },
  };
}

export function serviceDescription(name: string, summary: string): string {
  const text = `${name} na Aurum Detailing em Coronel Fabriciano, MG. ${summary}`.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const prefix = text.slice(0, 157);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary > 100 ? boundary : 157).trimEnd()}…`;
}
