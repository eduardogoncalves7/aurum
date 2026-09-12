// ---------------------------------------------------------------------------
// Domain types for the Aurum Detailing prototype.
// Kept framework-agnostic on purpose: this same shape should map cleanly to
// Supabase/PostgreSQL tables later without rewriting the UI layer.
// ---------------------------------------------------------------------------

export type VehicleType = "car" | "motorcycle";

/** Porte do carro — usado por serviços de "porte" (polimento, cerâmico...) */
export type CarSizeCategory = "small" | "medium" | "large";

/** Carroceria — usado por serviços de limpeza que dependem do tipo de carro */
export type CarBodyCategory = "hatch_sedan" | "suv" | "pickup";

export type VehicleCategory = CarSizeCategory | CarBodyCategory;

/**
 * Resposta única do cliente na etapa "Qual veículo vamos cuidar?" do fluxo
 * de atendimento. Mapeia para size/body internamente (ver lib/vehicle.ts) —
 * a UI só pergunta isso uma vez, nunca porte e carroceria separadamente.
 */
export type VehicleChatChoice = "hatch" | "sedan" | "suv" | "pickup" | "outro";

export interface Customer {
  id: string;
  name: string;
  phone: string; // identificador único do cliente, formato livre (com máscara na UI)
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  type: VehicleType;
  /** apenas para type === "car" */
  chatChoice?: VehicleChatChoice;
  createdAt: string;
}

export type PricingType = "fixed" | "vehicle_category" | "starting_at";

/**
 * Diz qual "dimensão" de veículo um serviço precisa para ter preço:
 * - size: pequeno/médio/grande (porte)
 * - body: hatch-sedan/suv/caminhonete (carroceria)
 * - motorcycle: preço único de moto
 * - none: preço fixo, não depende de veículo
 */
export type VehicleDimension = "size" | "body" | "motorcycle" | "none";

export interface Service {
  id: string;
  category: ServiceCategoryId;
  name: string;
  shortDescription: string;
  description?: string;
  /** Caminho da imagem em /public — ver getServiceImagePath() para a
   * convenção de nome de arquivo (id do serviço). */
  image?: string;
  pricingType: PricingType;
  vehicleDimension: VehicleDimension;
  /** preços por categoria de veículo, quando vehicleDimension !== "none" */
  prices?: Partial<Record<VehicleCategory | "motorcycle", number>>;
  /** preço fixo, quando pricingType === "fixed" e vehicleDimension === "none" */
  fixedPrice?: number;
  /** preço "a partir de", quando pricingType === "starting_at" */
  startingPrice?: number;
  note?: string;
  benefits?: string[];
  includes?: string[];
  gift?: string[];
  /** true quando o valor final depende de avaliação presencial */
  requiresEvaluation?: boolean;
  /** Duração aproximada em minutos, quando conhecida (nenhum serviço do
   * catálogo atual define isso ainda — exibido apenas se presente). */
  durationMinutes?: number;
  /** Tipos de veículo em que este serviço pode ser executado. Se omitido,
   * vale para carro e moto; a maioria do catálogo é exclusiva de carro. */
  vehicleTypes?: VehicleType[];
  /** variantes do mesmo serviço, ex: proteção cerâmica 1/2/3/4 anos */
  variants?: ServiceVariant[];
  featured?: boolean;
}

export interface ServiceVariant {
  id: string;
  label: string;
  prices?: Partial<Record<VehicleCategory, number>>;
  gift?: string[];
}

export type ServiceCategoryId =
  | "protecao"
  | "limpeza_carro"
  | "polimento"
  | "higienizacao"
  | "limpeza_moto"
  | "especiais";

export interface ServiceCategoryInfo {
  id: ServiceCategoryId;
  label: string;
  description?: string;
}

export type QuoteStatus =
  | "draft"
  | "sent"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface QuoteLineItem {
  serviceId: string;
  variantId?: string;
  name: string;
  price: number;
  isEstimate: boolean;
  requiresEvaluation: boolean;
}

export interface Quote {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  lineItems: QuoteLineItem[];
  estimatedTotal: number;
  status: QuoteStatus;
  createdAt: string;
}

/** Como o cliente prefere levar o veículo até a Aurum. */
export type DeliveryMethod = "dropoff" | "pickup";

export interface Appointment {
  id: string;
  quoteId: string;
  date: string; // ISO date, yyyy-mm-dd
  time: string; // HH:mm
  status: "pending" | "confirmed" | "cancelled";
  deliveryMethod: DeliveryMethod;
}

/** Resultado do cálculo de preço de um serviço para um veículo específico */
export interface PriceResult {
  type: "fixed" | "estimate" | "unavailable";
  value: number;
  requiresEvaluation: boolean;
}
