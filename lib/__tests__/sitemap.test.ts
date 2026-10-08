import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalog-items", () => ({
  listPublicCatalogItems: vi.fn(),
  catalogItemToService: vi.fn((item) => ({ id: item.id, ...item.detalhes })),
}));
import { listPublicCatalogItems, type CatalogItem } from "@/lib/catalog-items";
import { services } from "@/lib/data/services";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { getSiteUrl } from "@/lib/site-url";

const origin = "https://aurum.melhornegocio.shop";
const item = (id: string, hidden = false) => ({
  id, atualizadoEm: "2026-10-08T12:00:00.000Z", detalhes: { hiddenFromCatalog: hidden },
}) as CatalogItem;

describe("public sitemap", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("SITE_URL", ""); });
  afterEach(() => vi.unstubAllEnvs());

  it("lists public database pages, excluding hidden items and duplicates", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValue([item("novo-servico"), item("oculto", true), item("novo-servico")]);
    expect(await sitemap()).toEqual([
      { url: `${origin}/` }, { url: `${origin}/servicos` },
      { url: `${origin}/servicos/novo-servico`, lastModified: "2026-10-08T12:00:00.000Z" },
    ]);
  });

  it("does not restore factory services when the public catalog is empty", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValue([]);
    expect(await sitemap()).toEqual([{ url: `${origin}/` }, { url: `${origin}/servicos` }]);
  });

  it("uses visible factory services when the database is unavailable", async () => {
    vi.mocked(listPublicCatalogItems).mockRejectedValue(new Error("offline"));
    const entries = await sitemap();
    expect(entries.slice(2)).toEqual(services.filter((service) => !service.hiddenFromCatalog).map((service) => ({ url: `${origin}/servicos/${encodeURIComponent(service.id)}` })));
  });

  it("reads availability again on subsequent requests", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValueOnce([item("promocao")]).mockResolvedValueOnce([]);
    expect(await sitemap()).toHaveLength(3);
    expect(await sitemap()).toHaveLength(2);
  });

  it("encodes slugs and omits invalid modification dates", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValue([{ ...item("a/b ?"), atualizadoEm: "invalid" }]);
    expect((await sitemap())[2]).toEqual({ url: `${origin}/servicos/a%2Fb%20%3F` });
  });

  it("advertises the sitemap in robots and restricts admin/API crawling", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }, sitemap: `${origin}/sitemap.xml` });
  });

  it("supports a runtime domain override", () => {
    vi.stubEnv("SITE_URL", "https://example.com/");
    expect(getSiteUrl()).toBe("https://example.com");
    expect(robots().sitemap).toBe("https://example.com/sitemap.xml");
  });

  it.each(["not-a-url", "https://example.com/path", "https://user:pass@example.com", "https://example.com/?x=1", "ftp://example.com", "https://example.com/#fragment"])("rejects invalid origins: %s", (url) => {
    vi.stubEnv("SITE_URL", url);
    expect(getSiteUrl).toThrow();
  });
});
