import { afterEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getPool: () => ({ query }),
  quotedDbSchema: () => '"test"',
}));

import {
  createCatalogItem,
  deleteCatalogItem,
  listPublicCatalogItems,
  updateCatalogItem,
} from "@/lib/catalog-items";

const row = {
  id: "test-item",
  source_id: null,
  nome: "Serviço de teste",
  descricao_curta: "Descrição de teste",
  descricao: null,
  categoria: "protecao",
  subcategoria: null,
  veiculo_tipo: "car",
  precos: { fixed: 100 },
  includes: [],
  foto: null,
  promocao_inicio: null,
  promocao_fim: null,
  promocao_sem_data: false,
  ativo: true,
  criado_em: new Date("2026-01-01T00:00:00.000Z"),
  atualizado_em: new Date("2026-01-01T00:00:00.000Z"),
  service_data: {},
  variantes: [],
};

function publicReadCount() {
  return query.mock.calls.filter(([sql]) =>
    typeof sql === "string" && sql.includes("WHERE ativo = true"),
  ).length;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("public catalog cache", () => {
  it("reuses reads, invalidates after edits, and expires after 30 seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    query.mockImplementation(async (sql: string) => ({
      rows: ["INSERT", "UPDATE", "SELECT"].some((verb) => sql.startsWith(verb))
        ? [row]
        : [],
      rowCount: 1,
    }));

    await listPublicCatalogItems();
    await listPublicCatalogItems();
    expect(publicReadCount()).toBe(1);

    const input = {
      nome: "Serviço de teste",
      descricaoCurta: "Descrição de teste",
      categoria: "protecao" as const,
      veiculoTipo: "car" as const,
      precos: { fixed: 100 },
    };
    await createCatalogItem(input);
    await listPublicCatalogItems();
    expect(publicReadCount()).toBe(2);

    await updateCatalogItem("test-item", {
      ...input,
    });
    await listPublicCatalogItems();
    expect(publicReadCount()).toBe(3);

    await deleteCatalogItem("test-item");
    await listPublicCatalogItems();
    expect(publicReadCount()).toBe(4);

    vi.advanceTimersByTime(30_001);
    await listPublicCatalogItems();
    expect(publicReadCount()).toBe(5);
  });
});
