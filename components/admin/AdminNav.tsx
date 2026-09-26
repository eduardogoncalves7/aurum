"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/admin/servicos", label: "Serviços", icon: Wrench },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background-secondary md:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo className="text-sm" />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-gold/10 text-gold-light"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon size={17} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-border p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground"
          >
            <ArrowLeft size={17} />
            Voltar ao site
          </Link>
        </div>
      </aside>

      {/* Mobile: nav horizontal simples */}
      <nav className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border bg-background-secondary px-3 py-2 md:hidden">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium",
                active ? "bg-gold/15 text-gold-light" : "text-muted"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
