import { PriceResult, QuoteLineItem, Service, Vehicle } from "@/types";
import { getServiceById } from "@/lib/data/services";
import { resolveVehicleCategories } from "@/lib/vehicle";

export interface ServiceSelection {
  serviceId: string;
  variantId?: string;
}

/**
 * Calcula o preço de UM serviço para um veículo específico.
 * Nunca calcular preço diretamente dentro dos componentes visuais — sempre
 * passar por aqui, para manter a regra centralizada e substituível por uma
 * consulta ao Supabase no futuro sem tocar na UI.
 */
export function calculateServicePrice(
  service: Service,
  vehicle: Vehicle | null,
  variantId?: string
): PriceResult {
  // Preço fixo, não depende de veículo.
  if (service.pricingType === "fixed") {
    return { type: "fixed", value: service.fixedPrice ?? 0, requiresEvaluation: false };
  }

  // "A partir de" — sempre uma estimativa, independente de veículo.
  if (service.pricingType === "starting_at") {
    return { type: "estimate", value: service.startingPrice ?? 0, requiresEvaluation: false };
  }

  // pricingType === "vehicle_category": depende da dimensão do veículo.
  if (service.vehicleDimension === "motorcycle") {
    if (!vehicle || vehicle.type !== "motorcycle") {
      return { type: "unavailable", value: 0, requiresEvaluation: true };
    }
    const price = service.prices?.motorcycle;
    return price
      ? { type: "fixed", value: price, requiresEvaluation: false }
      : { type: "unavailable", value: 0, requiresEvaluation: true };
  }

  if (service.vehicleDimension === "size" || service.vehicleDimension === "body") {
    if (!vehicle || vehicle.type !== "car" || !vehicle.chatChoice) {
      return { type: "unavailable", value: 0, requiresEvaluation: true };
    }

    const variant = variantId ? service.variants?.find((v) => v.id === variantId) : undefined;
    const priceTable = variant ? variant.prices : service.prices;

    const { size, body } = resolveVehicleCategories(vehicle.chatChoice);
    const categoryKey = service.vehicleDimension === "size" ? size : body;

    const price = priceTable?.[categoryKey as keyof typeof priceTable];
    return price
      ? { type: "fixed", value: price, requiresEvaluation: false }
      : { type: "unavailable", value: 0, requiresEvaluation: true };
  }

  return { type: "unavailable", value: 0, requiresEvaluation: true };
}

/**
 * Preço de exibição para os cards de catálogo, antes de o cliente informar
 * o veículo — sempre o menor valor possível, sinalizado como "a partir de"
 * quando existir qualquer variação.
 */
export function getServiceDisplayPrice(service: Service): {
  value: number;
  isRange: boolean;
} {
  if (service.pricingType === "fixed") {
    return { value: service.fixedPrice ?? 0, isRange: false };
  }
  if (service.pricingType === "starting_at") {
    return { value: service.startingPrice ?? 0, isRange: false };
  }

  // vehicle_category: pegar o menor preço entre todas as variantes/categorias
  const tables = service.variants?.length
    ? service.variants.map((v) => v.prices ?? {})
    : [service.prices ?? {}];

  const values = tables.flatMap((table) => Object.values(table)) as number[];
  const min = values.length ? Math.min(...values) : 0;
  return { value: min, isRange: true };
}

/**
 * Monta os itens de orçamento e o total estimado para um conjunto de
 * serviços selecionados (com variantes opcionais) e um veículo.
 */
export function calculateQuoteTotal(
  selections: ServiceSelection[],
  vehicle: Vehicle | null
): { lineItems: QuoteLineItem[]; total: number; requiresEvaluation: boolean } {
  const lineItems: QuoteLineItem[] = [];
  let total = 0;
  let requiresEvaluation = false;

  for (const selection of selections) {
    const service = getServiceById(selection.serviceId);
    if (!service) continue;

    const result = calculateServicePrice(service, vehicle, selection.variantId);
    const variant = selection.variantId
      ? service.variants?.find((v) => v.id === selection.variantId)
      : undefined;

    if (result.requiresEvaluation) requiresEvaluation = true;
    if (result.type !== "unavailable") total += result.value;

    lineItems.push({
      serviceId: service.id,
      variantId: selection.variantId,
      name: variant ? `${service.name} — ${variant.label}` : service.name,
      price: result.value,
      isEstimate: result.type === "estimate",
      requiresEvaluation: result.requiresEvaluation,
    });
  }

  return { lineItems, total, requiresEvaluation };
}
