"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayOption {
  iso: string;
  label: string;
  dateLabel: string;
}

/** Gera dias úteis a partir de hoje, pulando domingos — a Aurum não atende
 * aos domingos. */
function buildDayOptions(count: number): DayOption[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

  const options: DayOption[] = [];
  let diffDays = 0;

  while (options.length < count) {
    const d = new Date(today);
    d.setDate(today.getDate() + diffDays);

    if (d.getDay() !== 0) {
      let label: string;
      if (diffDays === 0) label = "Hoje";
      else if (diffDays === 1) label = "Amanhã";
      else {
        const weekday = weekdayFmt.format(d);
        label = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace("-feira", "");
      }

      options.push({
        iso: d.toISOString().slice(0, 10),
        label,
        dateLabel: dateFmt.format(d),
      });
    }

    diffDays += 1;
  }

  return options;
}

interface Props {
  value: string | null;
  onChange: (iso: string) => void;
  days?: number;
}

export function DateSelector({ value, onChange, days = 6 }: Props) {
  const options = buildDayOptions(days);

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt.iso}
          type="button"
          onClick={() => onChange(opt.iso)}
          aria-pressed={value === opt.iso}
          className={cn(
            "flex min-h-[48px] items-center justify-between rounded-xl border px-4 py-3 transition-colors",
            value === opt.iso
              ? "border-gold bg-gold/10 text-foreground"
              : "border-border bg-background-secondary text-muted hover:border-border-strong"
          )}
        >
          <span className="font-medium">{opt.label}</span>
          <span className="flex items-center gap-2 text-sm text-muted-dark">
            {opt.dateLabel}
            {value === opt.iso && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-background">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
