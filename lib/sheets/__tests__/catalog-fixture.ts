import { services } from "../../data/services";
import { serviceRowSchema } from "../schema";
import type { PorteRow } from "../mapper";

// RECONSTRUCTED, NOT an export of the live spreadsheet. Prices/descriptions come
// from the current catalog, with only the three documented price corrections.
export const portes: PorteRow[] = [
  { porte_site: "Hatch/Sedan", classificacao_planilha: "Hatch / Sedan | Carro Pequeno | Automóvel", compatibilidade: "Carro" },
  { porte_site: "SUV", classificacao_planilha: "SUV | Carro Médio | Automóvel", compatibilidade: "Carro" },
  { porte_site: "Pickup", classificacao_planilha: "Caminhonete | Carro Grande | Automóvel", compatibilidade: "Carro" },
  { porte_site: "Moto", classificacao_planilha: "Moto", compatibilidade: "Moto" },
];
export const config = [{ chave: "porte_outro_equivale", valor: "SUV" }];
const classifications: Record<string, string> = { hatch_sedan: "Hatch / Sedan", suv: "SUV", pickup: "Caminhonete", small: "Carro Pequeno", medium: "Carro Médio", large: "Carro Grande" };
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const ids: Record<string, string> = {
  "limpeza-manutencao": "manutencao", "revestimento-1-ano": "protecao-1-ano", "revestimento-3-anos": "protecao-3-anos",
  "ppf-carro": "ppf-em-carro", "ppf-moto": "ppf-em-motos", "undercar": "detalhamento-undercar", "undercar-premium": "detalhamento-undercar-premium",
  "limpeza-moto-ouro": "limpeza-ouro", "limpeza-moto-premium": "limpeza-premium-para-moto", "combo-carro-0km": "pacote-carro-0km", "combo-preparacao-venda": "preparacao-para-venda",
};
const corrected: Record<string, number> = { "higienizacao-teto": 120, "higienizacao-bancos": 300, "limpeza-moto-premium": 250 };
export const catalogRows = services.flatMap((service, order) => {
  const id = ids[service.id] ?? service.id;
  const showcase = ["ppf-carro", "revestimento-ceramico"].includes(service.id);
  const complete = ["ppf-carro-full", "ppf-carro-frontal", "ppf-carro-hibrida"].includes(service.id);
  const kit = service.id.startsWith("ppf-carro-") && !complete;
  const group = service.id.startsWith("undercar") ? "Limpeza" : service.id === "limpeza-motor" ? "Limpeza de Motor" : service.id.startsWith("revestimento") ? "Revestimento Cerâmico" : complete ? "PPF Completos" : kit ? "Kits" : service.id === "ppf-carro" ? "PPF em Carro" : service.vehicleTypes?.includes("motorcycle") ? "Moto" : ({ limpeza_carro: "Limpeza", polimento: "Polimento", higienizacao: "Higienização", combos: "Combos", cristalizacao: "Cristalização" } as Record<string, string>)[service.category];
  const prices = showcase ? [["Automóvel", 4390]] : service.prices ? Object.entries(service.prices).map(([key, price]) => [classifications[key], price]) : [[service.vehicleTypes?.includes("motorcycle") ? "Moto" : "Automóvel", corrected[service.id] ?? service.fixedPrice ?? service.startingPrice]];
  if (service.id === "revestimento-ceramico") prices[0][1] = 1500;
  return prices.map(([classification, price]) => serviceRowSchema.parse({
    id: `${id}--${slug(String(classification))}`, servico_id: id, legacy_id: service.id,
    servico: service.id === "limpeza-moto-premium" ? "Limpeza Premium para Moto" : service.name,
    compatibilidade: service.vehicleTypes?.includes("motorcycle") ? "Moto" : "Carro", classificacao: classification,
    tipo_preco: showcase || service.pricingType === "starting_at" ? "A partir de" : "Fixo", preco: price,
    grupo_orcamento: group, categoria: service.category, tipo_item: showcase ? "vitrine" : kit ? "kit" : service.id.startsWith("undercar") ? "adicional" : service.category === "combos" ? "combo" : "principal",
    descricao: service.description ?? "", descricao_curta: service.shortDescription, imagem_url: service.image ?? "", observacao: service.note ?? "",
    inclusos: service.includes ?? [], beneficios: service.benefits ?? [], brinde: service.gift ?? [], ordem: order,
    ativo: true, visivel_catalogo: !service.hiddenFromCatalog, destaque: service.featured ?? false,
    atualizado_em: "2026-09-30T12:00:00.000Z", atualizado_por: "fixture-reconstruida",
  }));
});
