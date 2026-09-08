import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="font-display italic font-black text-xl tracking-tight text-gold">
        Aurum
      </span>
      <span className="font-display font-bold text-xl tracking-tight text-foreground">
        Detailing
      </span>
    </span>
  );
}
