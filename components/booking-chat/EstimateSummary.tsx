"use client";

import { MessageCircle } from "lucide-react";
import { QuoteLineItem, Vehicle } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { vehicleSummaryLabel } from "@/lib/vehicle";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

interface Props {
  name: string;
  phone: string;
  vehicle: Vehicle | null;
  lineItems: QuoteLineItem[];
  total: number;
  whatsappDestination: string;
  onSendWhatsApp: () => void;
}

export function EstimateSummary({
  name,
  phone,
  vehicle,
  lineItems,
  total,
  whatsappDestination,
  onSendWhatsApp,
}: Props) {
  const whatsappReady = isWhatsAppConfigured(whatsappDestination);
  const hasEstimateOnly = lineItems.some((i) => i.isEstimate || i.requiresEvaluation);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border-strong bg-background-secondary p-5">
        <p className="font-display font-bold text-foreground">{name}</p>
        <p className="text-sm text-muted">{phone}</p>

        <div className="mt-3 border-t border-border pt-3 text-sm">
          <span className="text-muted-dark">Veículo: </span>
          <span className="font-medium text-foreground">
            {vehicleSummaryLabel(vehicle)}
          </span>
        </div>

        <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {lineItems.map((item) => (
            <li
              key={`${item.serviceId}-${item.variantId ?? ""}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-muted">{item.name}</span>
              <span className="shrink-0 font-medium text-foreground">
                {item.requiresEvaluation ? "A avaliar" : formatCurrency(item.price)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-display font-bold text-foreground">
            {hasEstimateOnly ? "Estimativa" : "Subtotal"}
          </span>
          <span className="font-display text-xl font-extrabold text-gold-light">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-dark">
        O valor final pode mudar após a avaliação do veículo.
      </p>

      <button
        type="button"
        onClick={onSendWhatsApp}
        disabled={!whatsappReady}
        title={
          whatsappReady
            ? undefined
            : "Envio pelo WhatsApp ainda não configurado"
        }
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-background-elevated text-sm font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageCircle size={17} />
        Enviar orçamento pelo WhatsApp
      </button>
    </div>
  );
}
