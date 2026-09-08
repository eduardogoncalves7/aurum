"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

export function StepContainer({ children, onBack, className }: Props) {
  return (
    <div className="mx-auto w-full max-w-[430px] px-4 py-6 sm:py-10">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className={cn("flex flex-col gap-5", className)}>{children}</div>
    </div>
  );
}
