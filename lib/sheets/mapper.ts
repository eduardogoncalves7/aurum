import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Service, ServiceCategoryId, VehicleCategory, VehicleChatChoice, VehicleDimension } from "../../types";
import { serviceRowSchema, SheetsError, type ServiceRow } from "./schema";

export interface PorteRow { porte_site: string; classificacao_planilha: string; compatibilidade: string }
export type MapperConfig = Record<string, unknown> | readonly { chave: string; valor: unknown }[];
export interface MapperError { row: number; code: "INVALID_ROW" | "UNKNOWN_CLASSIFICATION" | "CONFLICT" | "INVALID_AUX"; fields: string[] }
export interface ServiceGroup {
  id: string; name: string; selection: "single" | "multiple";
  serviceIds: string[]; addonIds: string[]; catalogServiceId?: string;
}
export interface SheetSource {
  rows: ServiceRow[];
  baseline: Service;
  promotionalRowIds?: string[];
}
export type SheetService = Service & { sheetSource: SheetSource };
export interface MapperResult { services: SheetService[]; groups: ServiceGroup[]; errors: MapperError[] }
type PriceKey = VehicleCategory | "motorcycle";
type Choice = VehicleChatChoice | "motorcycle";
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const siteKeys: Record<string, { body: PriceKey; size: PriceKey; choices: Choice[] }> = {
  "hatch-sedan": { body: "hatch_sedan", size: "small", choices: ["hatch", "sedan"] },
  suv: { body: "suv", size: "medium", choices: ["suv"] },
  pickup: { body: "pickup", size: "large", choices: ["pickup"] },
  moto: { body: "motorcycle", size: "motorcycle", choices: ["motorcycle"] },
};
const dimension = (classification: string): VehicleDimension => classification === "Moto" ? "motorcycle" : classification === "Automóvel" ? "none" : classification.startsWith("Carro ") ? "size" : "body";
const auxSchema = z.object({ porte_site: z.string().min(1), classificacao_planilha: z.string().min(1), compatibilidade: z.enum(["Carro", "Moto"]) });
function porteIndex(portes: readonly unknown[], errors: MapperError[]) {
  const result = new Map<string, string[]>();
  portes.forEach((raw, i) => {
    const parsed = auxSchema.safeParse(raw);
    if (!parsed.success || !siteKeys[slug(parsed.data.porte_site)] || (slug(parsed.data.porte_site) === "moto") !== (parsed.data.compatibilidade === "Moto")) {
      errors.push({ row: i + 2, code: "INVALID_AUX", fields: ["Portes"] }); return;
    }
    const row = parsed.data;
    for (const classification of row.classificacao_planilha.split(/[;|]/).map(s => s.trim()).filter(Boolean)) {
      const key = `${row.compatibilidade}:${classification}`;
      result.set(key, [...new Set([...(result.get(key) ?? []), slug(row.porte_site)])]);
    }
  });
  return result;
}
function category(row: ServiceRow): ServiceCategoryId | undefined {
  const group = slug(row.grupo_orcamento), name = slug(row.servico_id);
  if (name.includes("undercar") || group === "limpeza-de-motor") return "especiais";
  if (group.includes("ppf") || group === "kits" || group === "revestimento-ceramico" || name.includes("ppf") || name === "revestimento-ceramico") return "protecao";
  if (row.compatibilidade === "Moto" && (group === "moto" || group === "limpeza")) return "limpeza_moto";
  const groups: Record<string, ServiceCategoryId> = { limpeza: "limpeza_carro", polimento: "polimento", higienizacao: "higienizacao", combos: "combos", cristalizacao: "cristalizacao", especiais: "especiais" };
  if (groups[group]) return groups[group];
  const categories: ServiceCategoryId[] = ["limpeza_carro", "limpeza_moto", "polimento", "protecao", "especiais", "higienizacao", "combos", "cristalizacao"];
  return categories.find(c => c === row.categoria);
}
function windowState(row: ServiceRow, now: number): "active" | "inactive" | "invalid" {
  // Date-only windows cover the entire stated day in the business timezone (UTC-3).
  const parse = (s: string, end: boolean) => z.iso.date().safeParse(s).success
    ? Date.parse(`${s}T${end ? "23:59:59.999" : "00:00:00.000"}-03:00`)
    : z.iso.datetime({ offset: true }).safeParse(s).success ? Date.parse(s) : NaN;
  if (!row.promo_inicio || !row.promo_fim) return "invalid";
  const start = parse(row.promo_inicio, false), end = parse(row.promo_fim, true);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return "invalid";
  return now >= start && now <= end ? "active" : "inactive";
}
const copy = <T>(value: T): T => structuredClone(value);
function baseline(service: Service): Service {
  const result = { ...service } as Service & { sheetSource?: SheetSource };
  delete result.sheetSource;
  return copy(result);
}
const min = (values: (number | undefined)[]) => {
  const numbers = values.filter((v): v is number => v !== undefined);
  return numbers.length ? Math.min(...numbers) : undefined;
};
const display = (s: Service) => s.fixedPrice ?? s.startingPrice ?? min(Object.values(s.prices ?? {}));

/** Pure read mapping: errors are reported without logging cell contents or making network calls. */
export function rowsToServices(rows: readonly unknown[], portes: readonly unknown[], config: MapperConfig, options: { now?: Date } = {}): MapperResult {
  const errors: MapperError[] = [], index = porteIndex(portes, errors);
  const settings = Array.isArray(config) ? Object.fromEntries(config.map(r => [r.chave, r.valor])) : config as Record<string, unknown>;
  const outro = slug(String(settings.porte_outro_equivale ?? "SUV"));
  if (!siteKeys[outro] || outro === "moto") errors.push({ row: 0, code: "INVALID_AUX", fields: ["porte_outro_equivale"] });
  const now = (options.now ?? new Date()).getTime();
  const grouped = new Map<string, ServiceRow[]>(), seen = new Set<string>();
  rows.forEach((raw, i) => {
    const parsed = serviceRowSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map(issue => issue.path.join(".")))];
      errors.push({ row: i + 2, code: fields.includes("classificacao") ? "UNKNOWN_CLASSIFICATION" : "INVALID_ROW", fields }); return;
    }
    const row = parsed.data;
    if (!row.ativo) return;
    if (!row.servico_id.trim() || !category(row) || (row.tipo_preco !== "Sob consulta" && row.preco === undefined)) {
      errors.push({ row: i + 2, code: "INVALID_ROW", fields: [!row.servico_id.trim() ? "servico_id" : !category(row) ? "grupo_orcamento" : "preco"] }); return;
    }
    if (!index.has(`${row.compatibilidade}:${row.classificacao}`)) {
      errors.push({ row: i + 2, code: "UNKNOWN_CLASSIFICATION", fields: ["classificacao"] }); return;
    }
    const promotional = row.preco_promocional !== undefined || row.tipo_item === "promocao";
    const window = promotional ? windowState(row, now) : "inactive";
    if (promotional && window === "invalid") {
      errors.push({ row: i + 2, code: "INVALID_ROW", fields: ["promo_inicio", "promo_fim"] }); return;
    }
    if (row.tipo_item === "promocao" && window !== "active") return;
    const group = grouped.get(row.servico_id) ?? [];
    if (seen.has(row.id) || group.some(r => r.classificacao === row.classificacao || r.legacy_id !== row.legacy_id || r.compatibilidade !== row.compatibilidade || category(r) !== category(row) || r.tipo_item !== row.tipo_item)) {
      errors.push({ row: i + 2, code: "CONFLICT", fields: ["id", "servico_id"] }); return;
    }
    seen.add(row.id); group.push(row); grouped.set(row.servico_id, group);
  });

  const services: SheetService[] = [];
  const ids = new Set<string>();
  for (const source of grouped.values()) {
    const first = source[0], id = first.legacy_id || first.servico_id;
    if (ids.has(id)) { errors.push({ row: 0, code: "CONFLICT", fields: ["legacy_id"] }); continue; }
    ids.add(id);
    const dimensions = new Set(source.map(r => dimension(r.classificacao)).filter(d => d !== "none"));
    if (dimensions.size > 1) { errors.push({ row: 0, code: "CONFLICT", fields: ["classificacao"] }); continue; }
    const dim = [...dimensions][0] ?? "none";
    const prices: NonNullable<Service["prices"]> = {}, original: NonNullable<Service["prices"]> = {};
    const choices: NonNullable<Service["pricesForVehicle"]> = {}, estimates: NonNullable<Service["estimateForVehicle"]> = {};
    let discounted = false;
    // Generic Automóvel is a fallback; a specific classification overrides it.
    for (const row of [...source].sort((a, b) => Number(b.classificacao === "Automóvel") - Number(a.classificacao === "Automóvel"))) {
      const promo = row.preco_promocional !== undefined && windowState(row, now) === "active";
      const price = row.tipo_preco === "Sob consulta" ? undefined : promo ? row.preco_promocional : row.preco;
      discounted ||= promo;
      const sites = row.classificacao === "Automóvel" ? ["hatch-sedan", "suv", "pickup"] : index.get(`${row.compatibilidade}:${row.classificacao}`)!;
      for (const site of sites) {
        const keys = siteKeys[site], key = dim === "size" ? keys.size : keys.body;
        if (price === undefined) { delete prices[key]; } else prices[key] = price;
        if (row.preco !== undefined) original[key] = row.preco;
        for (const choice of [...keys.choices, ...(site === outro ? ["outro" as const] : [])]) {
          if (price === undefined) delete choices[choice]; else choices[choice] = price;
          estimates[choice] = row.tipo_preco === "A partir de";
        }
      }
    }
    const allConsult = source.every(r => r.tipo_preco === "Sob consulta");
    const tablePrice = dim === "body" || dim === "size" || source.length > 1;
    const pricingType = allConsult || tablePrice ? "vehicle_category" : first.tipo_preco === "A partir de" ? "starting_at" : "fixed";
    const service: Service = {
      id, name: first.servico, category: category(first)!, shortDescription: first.descricao_curta,
      description: first.descricao, image: first.imagem_url || undefined,
      pricingType, vehicleDimension: dim, vehicleTypes: [first.compatibilidade === "Moto" ? "motorcycle" : "car"],
      includes: copy(first.inclusos), benefits: copy(first.beneficios), gift: copy(first.brinde), note: first.observacao,
      hiddenFromCatalog: source.every(r => !r.visivel_catalogo), featured: source.some(r => r.destaque),
      priceOnRequest: allConsult, requiresEvaluation: source.some(r => r.tipo_preco === "Sob consulta"),
      pricesForVehicle: choices, estimateForVehicle: estimates,
    };
    if (pricingType === "fixed") service.fixedPrice = displayPrice(choices);
    else if (pricingType === "starting_at") service.startingPrice = displayPrice(choices);
    else if (!allConsult) service.prices = prices;
    if (discounted) { service.originalPrice = min(Object.values(original)); service.originalPrices = original; }
    services.push({ ...service, sheetSource: { rows: copy(source), baseline: baseline(service), promotionalRowIds: source.filter(r => r.preco_promocional !== undefined && windowState(r, now) === "active").map(r => r.id) } });
  }
  services.sort((a, b) => (a.sheetSource.rows[0].ordem ?? Infinity) - (b.sheetSource.rows[0].ordem ?? Infinity));
  const members = (group: string, type?: ServiceRow["tipo_item"]) => services.filter(s => slug(s.sheetSource.rows[0].grupo_orcamento) === group && (!type || s.sheetSource.rows[0].tipo_item === type));
  const ceramic = services.find(s => s.sheetSource.rows[0].servico_id === "revestimento-ceramico" && s.sheetSource.rows[0].tipo_item === "vitrine");
  const tiers = members("revestimento-ceramico").filter(s => ["protecao-1-ano", "protecao-3-anos"].includes(s.sheetSource.rows[0].servico_id));
  if (ceramic) {
    ceramic.variants = tiers.map(s => ({ id: s.sheetSource.rows[0].servico_id.replace("protecao-", ""), label: s.name, prices: s.prices, pricesForVehicle: s.pricesForVehicle, gift: s.gift, originalPrices: s.originalPrices }));
    ceramic.pricingType = "vehicle_category"; ceramic.vehicleDimension = "size";
  }
  const ppf = services.find(s => s.sheetSource.rows[0].servico_id === "ppf-em-carro" && s.sheetSource.rows[0].tipo_item === "vitrine");
  const kits = members("kits", "kit"), completes = members("ppf-completos", "principal");
  if (ppf) ppf.priceBreakdown = [{ title: "Kits", values: kits }, { title: "PPF Completos", values: completes }].map(group => ({ title: group.title, items: group.values.flatMap(s => {
    const price = display(s);
    return price === undefined ? [] : [{ name: s.name, price, isEstimate: s.sheetSource.rows.some(r => r.tipo_preco === "A partir de"), originalPrice: s.originalPrice }];
  }) }));
  const groups: ServiceGroup[] = [
    { id: "limpeza", name: "Limpeza", selection: "single", serviceIds: members("limpeza", "principal").filter(s => s.vehicleTypes?.includes("car")).map(s => s.id), addonIds: members("limpeza", "adicional").map(s => s.id) },
    { id: "higienizacao", name: "Higienização", selection: "multiple", serviceIds: members("higienizacao").map(s => s.id), addonIds: [] },
    { id: "revestimento", name: "Revestimento Cerâmico", selection: "single", serviceIds: tiers.map(s => s.id), addonIds: [], catalogServiceId: ceramic?.id },
    { id: "ppf-completos", name: "PPF Completos", selection: "single", serviceIds: completes.map(s => s.id), addonIds: [], catalogServiceId: ppf?.id },
    { id: "kits", name: "Kits", selection: "multiple", serviceIds: kits.map(s => s.id), addonIds: [], catalogServiceId: ppf?.id },
  ].filter(group => group.serviceIds.length) as ServiceGroup[];
  for (const service of services) service.sheetSource.baseline = baseline(service);
  return { services, groups, errors };
}
function displayPrice(choices: Service["pricesForVehicle"]) { return min(Object.values(choices ?? {})); }

const categoryGroup: Record<ServiceCategoryId, string> = { limpeza_carro: "Limpeza", limpeza_moto: "Moto", polimento: "Polimento", protecao: "Revestimento Cerâmico", especiais: "Especiais", higienizacao: "Higienização", combos: "Combos", cristalizacao: "Cristalização" };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Converts edits back to their source rows; preserves ids, base prices and sheet-only fields.
 * First conversion of a new Service attaches serializable sheetSource identity to it.
 */
export function serviceToRows(service: Service & { sheetSource?: SheetSource }, portes: readonly unknown[]): ServiceRow[] {
  const errors: MapperError[] = [], index = porteIndex(portes, errors);
  if (errors.length || !service.id || !service.name.trim()) throw new SheetsError("SCHEMA");
  const previous = service.sheetSource;
  if (previous) {
    const result = copy(previous.rows), before = previous.baseline;
    if (service.vehicleDimension !== before.vehicleDimension || !same(service.vehicleTypes, before.vehicleTypes) || !same(service.pricesForVehicle, before.pricesForVehicle)) throw new SheetsError("SCHEMA");
    const fields = { name: "servico", description: "descricao", shortDescription: "descricao_curta", image: "imagem_url", note: "observacao", includes: "inclusos", benefits: "beneficios", gift: "brinde", featured: "destaque" } as const;
    for (const row of result) {
      if (!index.has(`${row.compatibilidade}:${row.classificacao}`)) throw new SheetsError("SCHEMA");
      for (const [field, column] of Object.entries(fields)) {
        const key = field as keyof typeof fields;
        if (!same(service[key], before[key])) Object.assign(row, { [column]: service[key] ?? (["inclusos", "beneficios", "brinde"].includes(column) ? [] : column === "destaque" ? false : "") });
      }
      if (service.hiddenFromCatalog !== before.hiddenFromCatalog) row.visivel_catalogo = !service.hiddenFromCatalog;
      if (service.category !== before.category) { row.categoria = service.category; row.grupo_orcamento = categoryGroup[service.category]; }
      if (!same(service.prices, before.prices) || service.fixedPrice !== before.fixedPrice || service.startingPrice !== before.startingPrice || service.priceOnRequest !== before.priceOnRequest || service.pricingType !== before.pricingType) {
        const sites = index.get(`${row.compatibilidade}:${row.classificacao}`)!;
        const keys = sites.map(site => service.vehicleDimension === "size" ? siteKeys[site].size : siteKeys[site].body);
        const values = keys.map(key => service.prices?.[key]);
        if (service.pricingType === "vehicle_category" && !service.priceOnRequest && new Set(values).size > 1) throw new SheetsError("SCHEMA");
        const value = service.pricingType === "fixed" ? service.fixedPrice : service.pricingType === "starting_at" ? service.startingPrice : values[0];
        const oldValue = before.pricingType === "fixed" ? before.fixedPrice : before.pricingType === "starting_at" ? before.startingPrice : before.prices?.[keys[0]];
        if (value === oldValue && service.pricingType === before.pricingType && service.priceOnRequest === before.priceOnRequest) continue;
        if (service.priceOnRequest) { row.tipo_preco = "Sob consulta"; row.preco = undefined; }
        else {
          if (value === undefined) throw new SheetsError("SCHEMA");
          // Editing the displayed discounted price updates the promotion, not the base price.
          if (previous.promotionalRowIds?.includes(row.id)) row.preco_promocional = value;
          else row.preco = value;
          if (service.pricingType !== before.pricingType || before.priceOnRequest) row.tipo_preco = service.pricingType === "starting_at" ? "A partir de" : "Fixo";
        }
      }
    }
    if (!same(service.variants, before.variants) || !same(service.priceBreakdown, before.priceBreakdown)) throw new SheetsError("SCHEMA"); // Edit real child services, never the derived showcase.
    return result.map(row => {
      const parsed = serviceRowSchema.safeParse(row);
      if (!parsed.success) throw new SheetsError("SCHEMA");
      return parsed.data;
    });
  }
  if (service.variants?.length || service.priceBreakdown?.length || !service.vehicleTypes?.length || service.vehicleTypes.length !== 1) throw new SheetsError("SCHEMA");
  const compatibility = service.vehicleTypes[0] === "motorcycle" ? "Moto" : "Carro";
  const identity = `${slug(service.name) || "servico"}-${randomUUID()}`;
  const classifications: { classification: string; price: number | undefined }[] = [];
  if (service.vehicleDimension === "body" || service.vehicleDimension === "size") {
    for (const [key, price] of Object.entries(service.prices ?? {})) {
      const matches = [...index.entries()].filter(([k, sites]) => k.startsWith(`${compatibility}:`) && dimension(k.split(":")[1]) === service.vehicleDimension && sites.some(site => (service.vehicleDimension === "size" ? siteKeys[site].size : siteKeys[site].body) === key));
      if (matches.length !== 1) throw new SheetsError("SCHEMA");
      classifications.push({ classification: matches[0][0].split(":")[1], price });
    }
  } else classifications.push({ classification: compatibility === "Moto" ? "Moto" : "Automóvel", price: service.fixedPrice ?? service.startingPrice });
  if (!classifications.length) throw new SheetsError("SCHEMA");
  const rows = classifications.map(({ classification, price }) => {
    if (!index.has(`${compatibility}:${classification}`) || (!service.priceOnRequest && price === undefined)) throw new SheetsError("SCHEMA");
    const parsed = serviceRowSchema.safeParse({ id: `${identity}--${slug(classification)}`, servico_id: identity, legacy_id: "",
      servico: service.name, compatibilidade: compatibility, classificacao: classification,
      tipo_preco: service.priceOnRequest ? "Sob consulta" : service.pricingType === "starting_at" ? "A partir de" : "Fixo", preco: service.priceOnRequest ? undefined : price,
      categoria: service.category, grupo_orcamento: service.subcategory || categoryGroup[service.category], tipo_item: service.category === "combos" ? "combo" : "principal",
      descricao: service.description ?? "", descricao_curta: service.shortDescription, imagem_url: service.image ?? "", observacao: service.note ?? "",
      inclusos: service.includes ?? [], beneficios: service.benefits ?? [], brinde: service.gift ?? [], ativo: true, visivel_catalogo: !service.hiddenFromCatalog, destaque: service.featured ?? false,
    });
    if (!parsed.success) throw new SheetsError("SCHEMA");
    return parsed.data;
  });
  service.id = identity;
  service.sheetSource = { rows: copy(rows), baseline: baseline(service) };
  return rows;
}
