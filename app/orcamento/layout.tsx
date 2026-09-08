import Link from "next/link";
import { X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function OrcamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Logo className="text-sm" />
        <Link
          href="/"
          aria-label="Fechar e voltar ao início"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
        >
          <X size={18} />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
