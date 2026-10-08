"use client";

import { MapPin, Phone } from "lucide-react";
import { usePublicConfig } from "@/lib/use-public-config";
import { buildMapsLink } from "@/lib/maps";

export function Footer() {
  const config = usePublicConfig();

  return (
    <footer className="border-t border-border bg-background-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 text-sm sm:px-6 md:grid-cols-[1fr_1fr_1.5fr] md:gap-8 md:py-8">
        <div className="min-w-0">
          <p className="font-display font-semibold text-foreground">Aurum Detailing</p>
          <p className="mt-1 text-xs text-muted">Detalhamento automotivo premium</p>
          <p className="mt-3 text-xs text-muted">CNPJ: 51.455.279/0001-39</p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Contato</p>
          <a
            href={`https://wa.me/${config.whatsappDestination.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Conversar com a Aurum pelo WhatsApp: ${config.phone}`}
            className="mt-1 inline-flex min-h-11 items-center gap-2 text-muted transition-colors hover:text-gold-light"
          >
            <Phone size={15} aria-hidden="true" className="shrink-0" />
            <span>{config.phone}</span>
          </a>
          <p className="text-xs text-muted">{config.hours}</p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Onde estamos</p>
          <address className="mt-1 not-italic">
            <a
              href={buildMapsLink(config.address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver endereço no mapa: ${config.address}`}
              className="flex min-h-11 items-start gap-2 py-2 leading-relaxed text-muted transition-colors hover:text-gold-light"
            >
              <MapPin size={15} aria-hidden="true" className="mt-1 shrink-0" />
              <span className="min-w-0 break-words">{config.address}</span>
            </a>
          </address>
        </div>
      </div>
    </footer>
  );
}
