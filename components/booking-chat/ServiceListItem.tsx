"use client";

import { Check } from "lucide-react";
import { Service } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { getServiceDisplayPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface Props {
  service: Service;
  selected: boolean;
  onClick: () => void;
}

export function ServiceListItem({ service, selected, onClick }: Props) {
  const { value, isRange } = getServiceDisplayPrice(service);
  const isEstimateOnly = service.pricingType === "starting_at";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[64px] w-full flex-col gap-1 rounded-xl border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-gold bg-gold/10"
          : "border-border bg-background-secondary hover:border-border-strong"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display font-bold text-foreground">
          {service.name}
        </span>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-background">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </div>
      <p className="text-sm text-muted">{service.shortDescription}</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="font-display font-bold text-gold-light">
          {isEstimateOnly || isRange ? "a partir de " : ""}
          {formatCurrency(value)}
        </span>
        {service.durationMinutes && (
          <span className="text-sm text-muted-dark">
            {service.durationMinutes} min
          </span>
        )}
      </div>
    </button>
  );
}
