import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("db/migrations/0006_canonical_catalog.sql"), "utf8");
const dbs: PGlite[] = [];
async function seededDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  dbs.push(db);
  await db.exec(readFileSync(resolve("db/migrations/0002_create_catalog_items.sql"), "utf8"));
  await db.exec(readFileSync(resolve("db/migrations/0003_expand_catalog.sql"), "utf8"));
  await db.query(`INSERT INTO public.catalog_items
    (nome, descricao_curta, categoria, veiculo_tipo, precos, promocao_inicio, promocao_fim,
     ativo, source_id, service_data, variantes, opcoes_preco)
    VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11)`, [
    "Promoção de Teste", "Descrição", "combos", "car", "{}", "2026-10-01", "2026-10-31",
    "promocao-teste", JSON.stringify({ pricingType: "starting_at", prices: { small: 100 },
      includes: ["Lavagem"], benefits: ["Proteção"], gift: ["Cera"], image: "/uploads/test.webp",
      featured: true, hiddenFromCatalog: true, promotionalPrices: { small: 80 },
      variants: [{ id: "one", label: "1 ano" }], priceBreakdown: [{ title: "Opção", items: [] }] }),
    "[]", "[]",
  ]);
  return db;
}

afterEach(async () => { await Promise.all(dbs.splice(0).map(db => db.close())); });

describe("canonical catalog additive migration", () => {
  it("backfills legacy fields, deactivates the labeled test promo, and is idempotent", async () => {
    const db = await seededDatabase();
    await db.exec(migration);
    const before = await db.query(`SELECT nome, slug, tipo_preco, precos, includes, beneficios, brinde, fotos,
      visivel_catalogo, destaque, ordem, precos_promocionais, ativo, service_data, variantes, opcoes_preco
      FROM public.catalog_items`);
    expect(before.rows[0]).toMatchObject({
      slug: expect.stringMatching(/^promocao-teste-[0-9a-f]{8}$/),
      tipo_preco: "starting_at",
      precos: { small: 100 },
      includes: ["Lavagem"], beneficios: ["Proteção"], brinde: ["Cera"], fotos: ["/uploads/test.webp"],
      visivel_catalogo: false, destaque: true, ordem: 0,
      precos_promocionais: { small: 80 }, ativo: false,
      variantes: [{ id: "one", label: "1 ano" }], opcoes_preco: [{ title: "Opção", items: [] }],
    });
    const categoryCount = await db.query("SELECT count(*)::int AS count FROM public.catalog_categories");
    await db.exec(migration);
    const after = await db.query(`SELECT nome, slug, tipo_preco, precos, includes, beneficios, brinde, fotos,
      visivel_catalogo, destaque, ordem, precos_promocionais, ativo, service_data, variantes, opcoes_preco
      FROM public.catalog_items`);
    expect(after.rows).toEqual(before.rows);
    expect((await db.query("SELECT count(*)::int AS count FROM public.catalog_categories")).rows).toEqual(categoryCount.rows);
    expect((await db.query("SELECT count(*)::int AS count FROM public.catalog_items")).rows).toEqual([{ count: 1 }]);
    expect((await db.query("SELECT count(*)::int AS count FROM public.catalog_item_history")).rows).toEqual([{ count: 0 }]);
    await expect(db.query(`INSERT INTO public.catalog_items
      (nome, descricao_curta, categoria, veiculo_tipo, precos, slug, tipo_preco)
      SELECT 'Outro', 'Descrição', 'combos', 'car', '{}', slug, 'fixed' FROM public.catalog_items`))
      .rejects.toThrow(/duplicate key/i);
  });

  it("captures before and after JSON with an actor label", async () => {
    const db = await seededDatabase();
    await db.exec(migration);
    await db.exec("SET aurum.actor = 'dono'");
    await db.query("UPDATE public.catalog_items SET nome = $1 WHERE source_id = $2", ["Nome revisado", "promocao-teste"]);
    const history = await db.query("SELECT quem, antes->>'nome' AS before_name, depois->>'nome' AS after_name FROM public.catalog_item_history");
    expect(history.rows).toEqual([{ quem: "dono", before_name: "Promoção de Teste", after_name: "Nome revisado" }]);
  });

  it("applies the three approved price corrections to both current and legacy data", async () => {
    const db = await seededDatabase();
    const items = [
      ["higienizacao-teto", { fixed: 200 }, { fixedPrice: 200 }, "car"],
      ["higienizacao-bancos", { fixed: 350 }, { fixedPrice: 350 }, "car"],
      ["limpeza-moto-premium", { starting_at: 300 }, { startingPrice: 300 }, "motorcycle"],
    ] as const;
    for (const [id, prices, details, vehicle] of items) {
      await db.query(`INSERT INTO public.catalog_items
        (nome, descricao_curta, categoria, veiculo_tipo, precos, source_id, service_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, "Descrição", "higienizacao", vehicle,
        JSON.stringify(prices), id, JSON.stringify(details)]);
    }
    await db.exec(migration);
    const { rows } = await db.query("SELECT source_id, precos, service_data FROM public.catalog_items WHERE source_id IS NOT NULL ORDER BY source_id");
    expect(rows).toContainEqual({ source_id: "higienizacao-teto", precos: { fixed: 120 }, service_data: { fixedPrice: 120 } });
    expect(rows).toContainEqual({ source_id: "higienizacao-bancos", precos: { fixed: 300 }, service_data: { fixedPrice: 300 } });
    expect(rows).toContainEqual({ source_id: "limpeza-moto-premium", precos: { starting_at: 250 }, service_data: { startingPrice: 250 } });
  });

  it("lets the legacy admin insert after migration and fills required canonical fields", async () => {
    const db = await seededDatabase();
    await db.exec(migration);
    const result = await db.query(`INSERT INTO public.catalog_items
      (nome, descricao_curta, categoria, veiculo_tipo, precos, service_data)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING slug, tipo_preco, visivel_catalogo, destaque, ordem, beneficios`, [
      "Novo Serviço", "Descrição curta", "combos", "car", JSON.stringify({ fixed: 90 }),
      JSON.stringify({ pricingType: "starting_at", benefits: ["Brilho"] }),
    ]);
    expect(result.rows[0]).toMatchObject({
      slug: expect.stringMatching(/^novo-servico-[0-9a-f]{8}$/), tipo_preco: "starting_at",
      visivel_catalogo: true, destaque: false, ordem: 0, beneficios: ["Brilho"],
    });
  });
});
