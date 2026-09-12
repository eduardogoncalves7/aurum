import { DeliveryMethod, QuoteLineItem } from "@/types";
import { formatCurrency } from "@/lib/formatters";

function deliveryMethodLabel(deliveryMethod: DeliveryMethod, address: string): string {
  return deliveryMethod === "dropoff"
    ? `Vou levar o veículo até a loja (${address})`
    : "Quero o serviço de busca em casa (a combinar)";
}

export function buildWhatsAppMessage(params: {
  name: string;
  phone: string;
  vehicleLabel: string;
  lineItems: QuoteLineItem[];
  total: number;
}): string {
  const { name, phone, vehicleLabel, lineItems, total } = params;

  const servicesText = lineItems
    .map((item) => `- ${item.name}: ${formatCurrency(item.price)}`)
    .join("\n");

  return [
    "Olá, Aurum Detailing!",
    "",
    "Gostaria de solicitar um orçamento.",
    "",
    `Nome: ${name}`,
    `Telefone: ${phone}`,
    "",
    `Veículo: ${vehicleLabel}`,
    "",
    "Serviços:",
    servicesText,
    "",
    `Estimativa total: ${formatCurrency(total)}`,
    "",
    "Entendo que o valor final pode mudar após a avaliação do veículo.",
  ].join("\n");
}

/** Mensagem para a etapa de confirmação — já com data e horário agendados. */
export function buildAppointmentWhatsAppMessage(params: {
  name: string;
  phone: string;
  vehicleLabel: string;
  lineItems: QuoteLineItem[];
  total: number;
  dateLabel: string;
  time: string;
  deliveryMethod: DeliveryMethod;
  address: string;
}): string {
  const { name, phone, vehicleLabel, lineItems, total, dateLabel, time, deliveryMethod, address } = params;

  const servicesText = lineItems.map((item) => `- ${item.name}`).join("\n");

  return [
    "Olá, Aurum Detailing!",
    "",
    "Acabei de agendar pelo site e queria confirmar.",
    "",
    `Nome: ${name}`,
    `Telefone: ${phone}`,
    `Veículo: ${vehicleLabel}`,
    "",
    "Serviços:",
    servicesText,
    "",
    `Data: ${dateLabel}`,
    `Horário: ${time}`,
    "",
    deliveryMethodLabel(deliveryMethod, address),
    "",
    `Estimativa: ${formatCurrency(total)}`,
    "",
    "Entendo que o valor final pode mudar após a avaliação do veículo.",
  ].join("\n");
}

/** Mensagem de cancelamento — usada tanto logo após agendar quanto na
 * seção "Meus agendamentos". */
export function buildCancelWhatsAppMessage(params: {
  serviceNames: string[];
  dateLabel?: string;
  time?: string;
}): string {
  const { serviceNames, dateLabel, time } = params;

  const lines = ["Olá, Aurum Detailing!", "", "Quero cancelar o serviço marcado."];

  if (serviceNames.length > 0) {
    lines.push("", `Serviço: ${serviceNames.join(", ")}`);
  }
  if (dateLabel && time) {
    lines.push(`Data: ${dateLabel}`, `Horário: ${time}`);
  }

  return lines.join("\n");
}

/** WHATSAPP_DESTINATION deve ser configurado via variável de ambiente ou no
 * painel /admin/configuracoes — nunca hardcoded no código. */
export function buildWhatsAppLink(destination: string, message: string): string {
  const digits = destination.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/** O envio pelo WhatsApp fica desativado até um número real ser configurado
 * — nunca usar um número fictício como fallback. */
export function isWhatsAppConfigured(destination: string): boolean {
  return destination.replace(/\D/g, "").length >= 10;
}
