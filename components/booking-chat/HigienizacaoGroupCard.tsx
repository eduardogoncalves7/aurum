"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Vehicle } from "@/types";
import { getServiceById, higienizacaoServiceIds } from "@/lib/data/services";
import { calculateServicePrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { ServiceImage } from "@/components/home/ServiceImage";
import { cn } from "@/lib/utils";

interface Props {
  vehicle: Vehicle | null;
  selectedServiceIds: string[];
  onToggle: (serviceId: string) => void;
}

export function HigienizacaoGroupCard({ vehicle, selectedServiceIds, onToggle }: Props) {
  const [open, setOpen] = useState(false);

  const options = higienizacaoServiceIds
    .map((id) => getServiceById(id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const selectedCount = options.filter((s) =>
    selectedServiceIds.includes(s.id)
  ).length;
  const cheapest = options[0];
  const cheapestPrice = calculateServicePrice(cheapest, vehicle).value;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        selectedCount > 0
          ? "border-gold/60 bg-gold/[0.04]"
          : "border-border bg-background-secondary"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background-elevated">
          <ServiceImage service={cheapest} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-foreground">
              Higienização
            </span>
            {selectedCount > 0 && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-background">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted">
            {selectedCount > 0
              ? `${selectedCount} selecionada${selectedCount > 1 ? "s" : ""}`
              : "Cintos, teto, ar, carpete, bancos ou completa"}
          </p>
          <span className="font-display font-bold text-gold-light">
            {selectedCount === 0 && "a partir de "}
            {formatCurrency(cheapestPrice)}
          </span>
        </div>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-4 pt-3">
          {options.map((option) => {
            const checked = selectedServiceIds.includes(option.id);
            const price = calculateServicePrice(option, vehicle);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border text-muted hover:border-border-strong"
                )}
              >
                <span className="flex items-center gap-2">
                  {checked ? (
                    <Check size={14} className="text-gold" />
                  ) : (
                    <Plus size={14} className="text-muted-dark" />
                  )}
                  {option.name}
                </span>
                <span className="font-semibold">{formatCurrency(price.value)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
