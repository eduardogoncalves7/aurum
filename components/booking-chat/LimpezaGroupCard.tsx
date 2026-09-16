"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Vehicle } from "@/types";
import {
  getServiceById,
  limpezaAddonServiceIds,
  limpezaTierServiceIds,
} from "@/lib/data/services";
import { calculateServicePrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { ServiceImage } from "@/components/home/ServiceImage";
import { cn } from "@/lib/utils";

interface Props {
  vehicle: Vehicle | null;
  selectedServiceIds: string[];
  onSelectTier: (tierServiceId: string) => void;
  onToggleAddon: (addonServiceId: string) => void;
}

export function LimpezaGroupCard({
  vehicle,
  selectedServiceIds,
  onSelectTier,
  onToggleAddon,
}: Props) {
  const [open, setOpen] = useState(false);

  const tierServices = limpezaTierServiceIds
    .map((id) => getServiceById(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const addonServices = limpezaAddonServiceIds
    .map((id) => getServiceById(id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const selectedTierId = selectedServiceIds.find((id) =>
    limpezaTierServiceIds.includes(id)
  );
  const selectedTier = tierServices.find((s) => s.id === selectedTierId);
  const cheapestTier = tierServices[0];

  const collapsedPrice = selectedTier
    ? calculateServicePrice(selectedTier, vehicle).value
    : calculateServicePrice(cheapestTier, vehicle).value;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        selectedTier
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
          <ServiceImage service={cheapestTier} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-foreground">
              Limpeza
            </span>
            {selectedTier && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-background">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted">
            {selectedTier
              ? selectedTier.name
              : "Manutenção, Técnica ou Premium"}
          </p>
          <span className="font-display font-bold text-gold-light">
            {!selectedTier && "a partir de "}
            {formatCurrency(collapsedPrice)}
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
        <div className="flex flex-col gap-4 border-t border-border p-4 pt-3">
          <div>
            <p className="mb-2 text-sm font-medium text-muted">
              Escolha o tipo de limpeza
            </p>
            <div className="flex flex-col gap-2">
              {tierServices.map((tier) => {
                const selected = selectedServiceIds.includes(tier.id);
                const price = calculateServicePrice(tier, vehicle);
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => onSelectTier(tier.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
                      selected
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border text-muted hover:border-border-strong"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {selected && <Check size={14} className="text-gold" />}
                      {tier.name}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(price.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTier && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">
                Adicionais (opcional)
              </p>
              <div className="flex flex-col gap-2">
                {addonServices.map((addon) => {
                  const checked = selectedServiceIds.includes(addon.id);
                  const price = calculateServicePrice(addon, vehicle);
                  const isEstimate = price.type === "estimate";
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => onToggleAddon(addon.id)}
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
                        {addon.name}
                      </span>
                      <span className="font-semibold">
                        {isEstimate && "a partir de "}
                        {formatCurrency(price.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
