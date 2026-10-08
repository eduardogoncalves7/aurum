import { describe, expect, it, vi } from "vitest";
import { pageMetadata, serviceDescription } from "../page-metadata";

vi.mock("@/lib/catalog-items", () => ({
  listPublicCatalogItems: vi.fn(),
  catalogItemToService: vi.fn((item) => ({ id: item.id, name: item.nome, shortDescription: item.descricaoCurta })),
}));
import { listPublicCatalogItems, type CatalogItem } from "@/lib/catalog-items";
import { generateMetadata } from "@/app/(site)/servicos/[slug]/page";

describe("page metadata", () => {
  it("keeps page titles, social previews and canonical URLs aligned", () => {
    const metadata = pageMetadata("Polimento técnico", "Conheça o polimento.", "/servicos/polimento-tecnico");
    expect(metadata.title).toEqual({ absolute: "Polimento técnico | Aurum Detailing" });
    expect(metadata.description).toBe("Conheça o polimento.");
    expect(metadata.alternates?.canonical).toBe("/servicos/polimento-tecnico");
    expect(metadata.openGraph).toMatchObject({ title: "Polimento técnico | Aurum Detailing", description: "Conheça o polimento.", url: "/servicos/polimento-tecnico", images: [{ url: "/og-image.png" }] });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: "Polimento técnico | Aurum Detailing", images: [{ url: "/og-image.png" }] });
  });

  it("creates concise service descriptions without repeated whitespace", () => {
    const description = serviceDescription("Polimento técnico", "  Cuidados\npara seu veículo. ");
    expect(description).toBe("Polimento técnico na Aurum Detailing em Coronel Fabriciano, MG. Cuidados para seu veículo.");
    const long = serviceDescription("Polimento técnico", "Cuidados especiais para seu veículo. ".repeat(20));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
  });

  it("uses the current public service data, including admin edits", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValue([{ id: "novo-servico", nome: "Novo serviço", descricaoCurta: "Proteção para o veículo." } as CatalogItem]);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "novo-servico" }) });
    expect(metadata.title).toEqual({ absolute: "Novo serviço | Aurum Detailing" });
    expect(metadata.description).toContain("Proteção para o veículo.");
  });

  it("does not advertise unavailable services when the public catalog is empty", async () => {
    vi.mocked(listPublicCatalogItems).mockResolvedValue([]);
    await expect(generateMetadata({ params: Promise.resolve({ slug: "polimento-tecnico" }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("uses the factory service metadata when the database is unavailable", async () => {
    vi.mocked(listPublicCatalogItems).mockRejectedValue(new Error("offline"));
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "polimento-tecnico" }) });
    expect(metadata.description).toContain("Coronel Fabriciano");
    expect(metadata.alternates?.canonical).toBe("/servicos/polimento-tecnico");
  });
});
