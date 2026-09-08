import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gold text-background hover:bg-gold-light active:bg-gold-dark disabled:bg-gold/40 disabled:text-background/60",
  secondary:
    "bg-background-elevated text-foreground border border-border hover:border-border-strong disabled:opacity-50",
  outline:
    "bg-transparent text-foreground border border-border-strong hover:border-gold hover:text-gold disabled:opacity-40",
  ghost: "bg-transparent text-muted hover:text-foreground disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-lg",
  lg: "h-14 px-7 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-colors duration-150 disabled:cursor-not-allowed cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
