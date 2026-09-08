"use client";

import { useEffect, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { services } from "@/lib/data/services";
import { getCategoryLabel } from "@/lib/data/categories";
import {
  ServiceOverride,
  clearServiceOverride,
  getServiceOverrides,
  saveServiceOverride,
} from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export default function AdminServicesPage() {
  const [overrides, setOverrides] = useState<Record<string, ServiceOverride>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setOverrides(getServiceOverrides());
  }, []);

  function handleSave(serviceId: string, override: ServiceOverride) {
    saveServiceOverride(serviceId, override);
    setOverrides((prev) => ({ ...prev, [serviceId]: override }));
    setOpenId(null);
  }

  function handleReset(serviceId: string) {
    clearServiceOverride(serviceId);
    setOverrides((prev) => {
      const copy = { ...prev };
      delete copy[serviceId];
      return copy;
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Serviços
      </h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Edição visual do catálogo. As alterações ficam salvas neste navegador
        e servem para validar o fluxo — ao integrar com Supabase, este painel
        passa a gravar direto na tabela <code>services</code>.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        {services.map((service) => {
          const override = overrides[service.id];
          const isOpen = openId === service.id;
          return (
            <div
              key={service.id}
              className="rounded-xl border border-border bg-background-secondary"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : service.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-foreground">
                    {override?.name ?? service.name}
                    {override && (
                      <span className="ml-2 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-light">
                        editado
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-dark">
                    {getCategoryLabel(service.category)} · {service.pricingType}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <ServiceEditForm
                  serviceId={service.id}
                  baseName={service.name}
                  baseShortDescription={service.shortDescription}
                  baseNote={service.note}
                  pricingType={service.pricingType}
                  basePrices={service.prices as Record<string, number> | undefined}
                  baseFixedPrice={service.fixedPrice}
                  baseStartingPrice={service.startingPrice}
                  hasVariants={!!service.variants?.length}
                  override={override}
                  onSave={(o) => handleSave(service.id, o)}
                  onReset={() => handleReset(service.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceEditForm({
  serviceId,
  baseName,
  baseShortDescription,
  baseNote,
  pricingType,
  basePrices,
  baseFixedPrice,
  baseStartingPrice,
  hasVariants,
  override,
  onSave,
  onReset,
}: {
  serviceId: string;
  baseName: string;
  baseShortDescription: string;
  baseNote?: string;
  pricingType: string;
  basePrices?: Record<string, number>;
  baseFixedPrice?: number;
  baseStartingPrice?: number;
  hasVariants: boolean;
  override?: ServiceOverride;
  onSave: (override: ServiceOverride) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(override?.name ?? baseName);
  const [shortDescription, setShortDescription] = useState(
    override?.shortDescription ?? baseShortDescription
  );
  const [note, setNote] = useState(override?.note ?? baseNote ?? "");
  const [fixedPrice, setFixedPrice] = useState(
    override?.fixedPrice ?? baseFixedPrice ?? 0
  );
  const [startingPrice, setStartingPrice] = useState(
    override?.startingPrice ?? baseStartingPrice ?? 0
  );
  const [prices, setPrices] = useState<Record<string, number>>(
    override?.prices ?? basePrices ?? {}
  );

  return (
    <div className="flex flex-col gap-4 border-t border-border p-4">
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Descrição curta"
        value={shortDescription}
        onChange={(e) => setShortDescription(e.target.value)}
      />
      <Input label="Observação" value={note} onChange={(e) => setNote(e.target.value)} />

      {pricingType === "fixed" && (
        <Input
          label="Preço (R$)"
          type="number"
          value={fixedPrice}
          onChange={(e) => setFixedPrice(Number(e.target.value))}
        />
      )}

      {pricingType === "starting_at" && (
        <Input
          label='Preço "a partir de" (R$)'
          type="number"
          value={startingPrice}
          onChange={(e) => setStartingPrice(Number(e.target.value))}
        />
      )}

      {pricingType === "vehicle_category" && !hasVariants && basePrices && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.keys(basePrices).map((category) => (
            <Input
              key={category}
              label={category}
              type="number"
              value={prices[category] ?? 0}
              onChange={(e) =>
                setPrices((prev) => ({ ...prev, [category]: Number(e.target.value) }))
              }
            />
          ))}
        </div>
      )}

      {hasVariants && (
        <p className="text-xs text-muted-dark">
          Este serviço tem pacotes com preços por variante — edição de
          variantes não está disponível neste protótipo visual.
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              name,
              shortDescription,
              note: note || undefined,
              fixedPrice: pricingType === "fixed" ? fixedPrice : undefined,
              startingPrice: pricingType === "starting_at" ? startingPrice : undefined,
              prices: pricingType === "vehicle_category" && !hasVariants ? prices : undefined,
            })
          }
        >
          Salvar
        </Button>
        {override && (
          <Button size="sm" variant="ghost" onClick={onReset} className="gap-1.5">
            <RotateCcw size={14} />
            Restaurar padrão
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-dark" data-service={serviceId}>
        Alterações salvas localmente e refletidas apenas neste painel.
      </p>
    </div>
  );
}
