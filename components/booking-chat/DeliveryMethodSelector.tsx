"use client";

import { MapPin, Home } from "lucide-react";
import { DeliveryMethod } from "@/types";
import { SelectionCard } from "@/components/booking-chat/SelectionCard";
import { buildMapsLink } from "@/lib/maps";

interface Props {
  value: DeliveryMethod | null;
  onChange: (value: DeliveryMethod) => void;
  address: string;
}

export function DeliveryMethodSelector({ value, onChange, address }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <SelectionCard
        label="Vou levar até a loja"
        description={address}
        selected={value === "dropoff"}
        onClick={() => onChange("dropoff")}
      />
      {value === "dropoff" && (
        <a
          href={buildMapsLink(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-1.5 self-start text-sm text-gold hover:underline"
        >
          <MapPin size={14} />
          Ver no mapa
        </a>
      )}

      <SelectionCard
        label="Buscar meu veículo em casa"
        description="Consultar condições e taxa com a equipe"
        selected={value === "pickup"}
        onClick={() => onChange("pickup")}
      />
      {value === "pickup" && (
        <p className="ml-1 flex items-center gap-1.5 self-start text-sm text-muted">
          <Home size={14} />
          A equipe vai combinar o endereço e as condições com você.
        </p>
      )}
    </div>
  );
}
