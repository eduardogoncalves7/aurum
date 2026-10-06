"use client";

import { useId } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { brazilianDateToIso, isoDateToBrazilian } from "@/lib/promotion-dates";

export function PromotionDateInput({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const iso = brazilianDateToIso(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input id={id} label={`${label} (dia/mês/ano)`} value={value} placeholder="dd/mm/aaaa"
            inputMode="numeric" maxLength={10} aria-describedby={`${id}-help${value && !iso ? ` ${id}-error` : ""}`}
            error={value && !iso ? "Use dd/mm/aaaa e uma data existente." : undefined}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
              onChange(digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
                : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
            }} />
        </div>
        <label className="relative mt-[26px] flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-gold focus-within:ring-2 focus-within:ring-gold">
          <CalendarDays size={20} aria-hidden="true" />
          <input type="date" aria-label={`Escolher ${label.toLowerCase()} no calendário`}
            value={iso ?? ""} onChange={(event) => onChange(isoDateToBrazilian(event.target.value))}
            onClick={(event) => {
              // Browsers without showPicker retain their normal date-input interaction.
              try { event.currentTarget.showPicker?.(); } catch { /* Native fallback. */ }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
      </div>
      <p id={`${id}-help`} className="text-xs text-muted-dark">Exemplo: 05/10/2026 = 5 de outubro de 2026.</p>
    </div>
  );
}
