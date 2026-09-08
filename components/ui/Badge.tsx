import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "gold" | "neutral" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  gold: "bg-gold/12 text-gold-light border-gold/30",
  neutral: "bg-white/5 text-muted border-white/10",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
