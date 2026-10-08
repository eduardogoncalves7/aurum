import type { MetadataRoute } from "next";
import { catalogItemToService, listPublicCatalogItems } from "@/lib/catalog-items";
import { services } from "@/lib/data/services";
import { getSiteUrl } from "@/lib/site-url";

// Read current availability on every request, including promotion dates.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  const items = await listPublicCatalogItems().catch(() => null);
  // Match the public pages: an empty database catalog must stay empty.
  const entries = items !== null
    ? items.filter((item) => !catalogItemToService(item).hiddenFromCatalog).map((item) => ({
        url: `${origin}/servicos/${encodeURIComponent(item.id)}`,
        ...(Number.isFinite(Date.parse(item.atualizadoEm)) ? { lastModified: item.atualizadoEm } : {}),
      }))
    : services.filter((service) => !service.hiddenFromCatalog).map((service) => ({
        url: `${origin}/servicos/${encodeURIComponent(service.id)}`,
      }));

  return [
    { url: `${origin}/` },
    { url: `${origin}/servicos` },
    ...entries.filter((entry, index) => entries.findIndex((other) => other.url === entry.url) === index),
  ];
}
