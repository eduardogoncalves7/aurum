/** Canonical public origin; SITE_URL allows a future domain change at runtime. */
export function getSiteUrl(): string {
  const url = new URL(process.env.SITE_URL || "https://aurum.melhornegocio.shop");
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash || url.pathname !== "/"
  ) {
    throw new Error("SITE_URL deve conter apenas a origem pública, como https://aurum.melhornegocio.shop.");
  }
  return url.origin;
}
