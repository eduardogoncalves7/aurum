"use client";

import { cn } from "@/lib/utils";

const ALL_SLOTS = ["09:00", "09:40", "10:20", "11:00", "14:00", "15:20", "16:00", "16:40"];

interface Props {
  value: string | null;
  onChange: (time: string) => void;
  bookedSlots?: string[];
}

export function TimeSelector({ value, onChange, bookedSlots = [] }: Props) {
  const available = ALL_SLOTS.filter((slot) => !bookedSlots.includes(slot));

  if (available.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-background-secondary px-4 py-4 text-sm text-muted">
        Não há horários disponíveis nesta data. Escolha outro dia.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {available.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          aria-pressed={value === slot}
          className={cn(
            "min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
            value === slot
              ? "border-gold bg-gold/10 text-gold-light"
              : "border-border bg-background-secondary text-muted hover:border-border-strong"
          )}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
