"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Vehicle } from "@/types";
import {
  getServiceById,
  ppfCarroCompletoServiceIds,
  ppfCarroKitServiceIds,
} from "@/lib/data/services";
import { calculateServicePrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { ServiceImage } from "@/components/home/ServiceImage";
import { cn } from "@/lib/utils";

interface Props {
  vehicle: Vehicle | null;
  selectedServiceIds: string[];
  onToggleKit: (serviceId: string) => void;
  onSelectCompleto: (serviceId: string) => void;
}

export function PpfCarroGroupCard({
  vehicle,
  selectedServiceIds,
  onToggleKit,
  onSelectCompleto,
}: Props) {
  const [open, setOpen] = useState(false);

  const kits = ppfCarroKitServiceIds
    .map((id) => getServiceById(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const completos = ppfCarroCompletoServiceIds
    .map((id) => getServiceById(id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const selectedKitsCount = kits.filter((s) =>
    selectedServiceIds.includes(s.id)
  ).length;
  const selectedCompletoId = selectedServiceIds.find((id) =>
    ppfCarroCompletoServiceIds.includes(id)
  );
  const selectedCompleto = completos.find((s) => s.id === selectedCompletoId);
  const anySelected = selectedKitsCount > 0 || !!selectedCompleto;

  const cheapestCompleto = completos[completos.length - 1]; // ordem decrescente
  const collapsedPrice = selectedCompleto
    ? calculateServicePrice(selectedCompleto, vehicle).value
    : calculateServicePrice(cheapestCompleto, vehicle).value;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        anySelected
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
          <ServiceImage service={cheapestCompleto} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-foreground">
              PPF em Carro
            </span>
            {anySelected && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-background">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted">
            {selectedCompleto
              ? selectedCompleto.name
              : "Kits avulsos ou pacotes completos"}
            {selectedKitsCount > 0 &&
              ` +${selectedKitsCount} kit${selectedKitsCount > 1 ? "s" : ""}`}
          </p>
          <span className="font-display font-bold text-gold-light">
            {!selectedCompleto && "a partir de "}
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
              PPF Completos (escolha um)
            </p>
            <div className="flex flex-col gap-2">
              {completos.map((completo) => {
                const selected = selectedServiceIds.includes(completo.id);
                const price = calculateServicePrice(completo, vehicle);
                return (
                  <button
                    key={completo.id}
                    type="button"
                    onClick={() => onSelectCompleto(completo.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
                      selected
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border text-muted hover:border-border-strong"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {selected && <Check size={14} className="text-gold" />}
                      {completo.name}
                    </span>
                    <span className="font-semibold">
                      a partir de {formatCurrency(price.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">
              Kits avulsos (marque quantos quiser)
            </p>
            <div className="flex flex-col gap-2">
              {kits.map((kit) => {
                const checked = selectedServiceIds.includes(kit.id);
                const price = calculateServicePrice(kit, vehicle);
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => onToggleKit(kit.id)}
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
                      {kit.name}
                    </span>
                    <span className="font-semibold">{formatCurrency(price.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
