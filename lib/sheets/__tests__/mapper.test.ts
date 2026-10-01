import { describe, expect, it } from "vitest";
import { rowsToServices, serviceToRows } from "../mapper";
import { catalogRows, config, portes } from "./catalog-fixture";
import { services as current, limpezaTierServiceIds, limpezaAddonServiceIds, higienizacaoServiceIds, ppfCarroCompletoServiceIds, ppfCarroKitServiceIds } from "../../data/services";
import { calculateServicePrice, getServiceDisplayPrice } from "../../pricing";
import type { Service, Vehicle } from "../../../types";

const map = (rows: unknown[] = catalogRows) => rowsToServices(rows, portes, config, { now: new Date("2026-09-30T15:00:00Z") });
const vehicle = (chatChoice: Vehicle["chatChoice"] = "suv"): Vehicle => ({ id: "car", customerId: "test", type: "car", chatChoice, createdAt: "" });
const sort = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id));

describe("catalog mapper", () => {
  it("round-trips all 51 reconstructed rows, including sheet-only fields, after JSON serialization", () => {
    expect(catalogRows).toHaveLength(51);
    const result = map(); expect(result.errors).toEqual([]); expect(result.services).toHaveLength(33);
    const restored = JSON.parse(JSON.stringify(result.services)).flatMap((s: Service) => serviceToRows(s, portes));
    expect(sort(restored)).toEqual(sort(structuredClone(catalogRows)));
  });
  it("preserves current IDs, categories, metadata and prices except the three documented corrections", () => {
    const { services } = map();
    const corrected: Record<string, number> = { "higienizacao-teto": 120, "higienizacao-bancos": 300, "limpeza-moto-premium": 250 };
    for (const old of current) {
      const value = services.find(s => s.id === old.id)!;
      expect(value.category).toBe(old.category);
      expect(value.name).toBe(catalogRows.find(r => r.legacy_id === old.id)!.servico);
      expect(value.hiddenFromCatalog).toBe(old.hiddenFromCatalog ?? false);
      expect(getServiceDisplayPrice(value).value).toBe(corrected[old.id] ?? getServiceDisplayPrice(old).value);
      if (old.prices) expect(value.prices).toEqual(old.prices);
    }
  });
  it("provides one single-choice Limpeza group plus two additions and multi-choice Higienização", () => {
    const { groups } = map();
    expect(groups.find(g => g.id === "limpeza")).toMatchObject({ selection: "single", serviceIds: limpezaTierServiceIds, addonIds: limpezaAddonServiceIds });
    expect(groups.find(g => g.id === "higienizacao")).toMatchObject({ selection: "multiple", serviceIds: higienizacaoServiceIds });
  });
  it("builds six PPF kits and three complete packages, with estimate flags", () => {
    const { services, groups } = map();
    const ppf = services.find(s => s.id === "ppf-carro")!;
    expect(ppf.priceBreakdown?.map(g => [g.title, g.items.length])).toEqual([["Kits", 6], ["PPF Completos", 3]]);
    expect(ppf.priceBreakdown?.[1].items.every(i => i.isEstimate)).toBe(true);
    expect(groups.find(g => g.id === "kits")?.serviceIds).toEqual(ppfCarroKitServiceIds);
    expect(groups.find(g => g.id === "ppf-completos")?.serviceIds).toEqual(ppfCarroCompletoServiceIds);
  });
  it("builds two ceramic variants with gifts and retains real booking services", () => {
    const { services } = map();
    const ceramic = services.find(s => s.id === "revestimento-ceramico")!;
    expect(ceramic.variants).toHaveLength(2);
    expect(ceramic.variants?.map(v => v.id)).toEqual(["1-ano", "3-anos"]);
    expect(ceramic.variants?.[1].gift).toEqual(current.find(s => s.id === "revestimento-3-anos")!.gift);
    expect(calculateServicePrice(ceramic, vehicle(), "3-anos").value).toBe(2700);
    expect(services.find(s => s.id === "revestimento-1-ano")?.hiddenFromCatalog).toBe(true);
  });
  it("uses Portes for Sedan and Config for Outro rather than the old hardcoded mapping", () => {
    const { services } = rowsToServices(catalogRows, portes, { porte_outro_equivale: "Pickup" });
    const polish = services.find(s => s.id === "polimento-comercial")!;
    expect(calculateServicePrice(polish, vehicle("sedan")).value).toBe(600);
    expect(calculateServicePrice(polish, vehicle("outro")).value).toBe(800);
  });
  it("applies Automóvel to every car choice and rejects incompatible vehicles", () => {
    const value = map().services.find(s => s.id === "cristalizacao-vidros")!;
    for (const choice of ["hatch", "sedan", "suv", "pickup", "outro"] as const) expect(calculateServicePrice(value, vehicle(choice)).value).toBe(250);
    expect(calculateServicePrice(value, { ...vehicle(), type: "motorcycle" }).type).toBe("unavailable");
  });
  it("ignores inactive/invalid rows and reports unknown classifications without cell contents", () => {
    const row = catalogRows.find(r => r.legacy_id === "cristalizacao-vidros")!;
    const result = map([{ ...row, ativo: false }, { ...row, classificacao: "secret-unknown" }, { ...row, preco: "bad" }]);
    expect(result.services).toEqual([]); expect(result.errors).toHaveLength(2);
    expect(JSON.stringify(result.errors)).not.toContain("secret-unknown");
  });
  it("represents Sob consulta without charging zero or producing a PPF price entry", () => {
    const row = catalogRows.find(r => r.legacy_id === "cristalizacao-vidros")!;
    const value = map([{ ...row, tipo_preco: "Sob consulta", preco: undefined }]).services[0];
    expect(value.fixedPrice).toBeUndefined(); expect(value.startingPrice).toBeUndefined(); expect(value.prices).toBeUndefined();
    expect(calculateServicePrice(value, vehicle())).toMatchObject({ type: "unavailable", requiresEvaluation: true });
  });
  it("applies current promotions, retains originals and does not overwrite base prices on round-trip", () => {
    const base = catalogRows.find(r => r.legacy_id === "cristalizacao-vidros")!;
    const row = { ...base, preco_promocional: 199, promo_inicio: "2026-09-30", promo_fim: "2026-09-30" };
    const service = map([row]).services[0];
    expect(service.fixedPrice).toBe(199); expect(service.originalPrice).toBe(250);
    expect(serviceToRows(service, portes)[0]).toEqual(row);
    service.fixedPrice = 180;
    expect(serviceToRows(service, portes)[0]).toMatchObject({ preco: 250, preco_promocional: 180 });
    expect(rowsToServices([row], portes, config, { now: new Date("2026-10-01T03:00:00Z") }).services[0].fixedPrice).toBe(250);
  });
  it("limits standalone promotions to their inclusive São Paulo date window", () => {
    const row = { ...catalogRows[0], tipo_item: "promocao", promo_inicio: "2026-09-30", promo_fim: "2026-09-30" };
    expect(rowsToServices([row], portes, config, { now: new Date("2026-09-30T03:00:00Z") }).services).toHaveLength(1);
    expect(rowsToServices([row], portes, config, { now: new Date("2026-10-01T02:59:59Z") }).services).toHaveLength(1);
    expect(rowsToServices([row], portes, config, { now: new Date("2026-10-01T03:00:00Z") }).services).toHaveLength(0);
  });
  it("preserves stable row ids on rename and changes only edited domain fields", () => {
    const value = map().services.find(s => s.id === "limpeza-tecnica")!;
    const original = structuredClone(value.sheetSource.rows);
    value.name = "Nome alterado"; value.prices = { ...value.prices, suv: 255 };
    const rows = serviceToRows(value, portes);
    expect(rows.map(r => r.id)).toEqual(original.map(r => r.id));
    expect(rows.find(r => r.classificacao === "SUV")?.preco).toBe(255);
    expect(rows.every(r => r.servico === "Nome alterado")).toBe(true);
    expect(rows[0].atualizado_em).toBe(original[0].atualizado_em);
  });
  it("creates one row per porte with collision-resistant, repeatable identity", () => {
    const create = (): Service => ({ id: "admin-id", name: "Novo serviço", category: "polimento", shortDescription: "", pricingType: "vehicle_category", vehicleDimension: "size", vehicleTypes: ["car"], prices: { small: 10, medium: 20, large: 30 } });
    const first = create(), second = create();
    const a = serviceToRows(first, portes), b = serviceToRows(second, portes);
    expect(a).toHaveLength(3); expect(a[0].servico_id).not.toBe(b[0].servico_id);
    expect(first.id).toBe(a[0].servico_id); expect(a[0].legacy_id).toBe("");
    expect(map([...a, ...b]).services).toHaveLength(2);
    expect(serviceToRows(first, portes)).toEqual(a);
    expect(serviceToRows(JSON.parse(JSON.stringify(first)), portes)).toEqual(a);
    expect(map(a).services[0].prices).toEqual(first.prices);
  });
  it("keeps future promotion prices untouched when editing another porte", () => {
    const rows = catalogRows.filter(r => r.legacy_id === "polimento-comercial").map(r => ({ ...r, preco_promocional: 500, promo_inicio: r.classificacao === "Carro Pequeno" ? "2026-09-01" : "2026-11-01", promo_fim: "2026-12-01" }));
    const service = map(rows).services[0];
    service.prices = { ...service.prices, large: 850 };
    const written = serviceToRows(service, portes);
    expect(written[0]).toEqual(rows[0]); expect(written[1]).toEqual(rows[1]);
    expect(written[2]).toMatchObject({ preco: 850, preco_promocional: 500 });
  });
  it("rejects invalid dates, unknown auxiliary mappings and ambiguous duplicates without throwing", () => {
    const row = catalogRows[0];
    expect(map([{ ...row, preco_promocional: 1, promo_inicio: "2026-02-30", promo_fim: "2026-12-01" }]).errors).toHaveLength(1);
    expect(rowsToServices([row], [], config).errors[0].code).toBe("UNKNOWN_CLASSIFICATION");
    expect(map([row, row]).errors[0].code).toBe("CONFLICT");
  });
  it("uses sheet names and row ordering for all derived PPF content", () => {
    const rows = catalogRows.map(r => r.tipo_item === "kit" ? { ...r, servico: `Nome da planilha ${r.id}`, ordem: 100 - (r.ordem ?? 0) } : r);
    const ppf = map(rows).services.find(s => s.id === "ppf-carro")!;
    expect(ppf.priceBreakdown?.[0].items.map(i => i.name)).toEqual(rows.filter(r => r.tipo_item === "kit").sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map(r => r.servico));
  });
  it("marks per-porte starting prices as estimates and supports a zero promotional price", () => {
    const rows = catalogRows.filter(r => r.legacy_id === "polimento-comercial").map(r => ({ ...r, tipo_preco: "A partir de", preco_promocional: 0, promo_inicio: "2026-09-01", promo_fim: "2026-10-01" }));
    const service = map(rows).services[0];
    expect(calculateServicePrice(service, vehicle())).toMatchObject({ value: 0, type: "estimate" });
    expect(service.originalPrices?.suv).toBeUndefined();
    expect(service.originalPrices?.medium).toBe(700);
  });
});
