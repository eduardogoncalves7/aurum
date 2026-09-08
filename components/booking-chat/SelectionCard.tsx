"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export function SelectionCard({ label, description, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-gold bg-gold/10 text-foreground"
          : "border-border bg-background-secondary text-muted hover:border-border-strong"
      )}
    >
      <span>
        <span className="block font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-muted-dark">
            {description}
          </span>
        )}
      </span>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-background">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
