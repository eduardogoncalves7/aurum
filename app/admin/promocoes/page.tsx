"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog-items";
import { getCategoryLabel } from "@/lib/data/categories";
import { formatCurrency, formatDatePtBr } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CatalogItemForm } from "@/components/admin/CatalogItemForm";

function isPromotion(item: CatalogItem) {
  return !!(item.promocaoInicio && item.promocaoFim);
}

function statusOf(item: CatalogItem): { label: string; tone: "gold" | "neutral" | "warning" } {
  if (!item.ativo) return { label: "Inativa", tone: "neutral" };
  const today = new Date().toISOString().slice(0, 10);
  if (item.promocaoFim && item.promocaoFim < today) return { label: "Encerrada", tone: "neutral" };
  if (item.promocaoInicio && item.promocaoInicio > today) return { label: "Agendada", tone: "warning" };
  return { label: "Em vigor", tone: "gold" };
}

export default function AdminPromotionsPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);

  function reload() {
    fetch("/api/admin/catalog-items")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar");
        return res.json();
      })
      .then((data: { items: CatalogItem[] }) => setItems((data.items ?? []).filter(isPromotion)))
      .catch(() => setLoadError(true));
  }

  useEffect(reload, []);

  async function handleDelete(id: string) {
    if (!confirm("Apagar esta promoção? Não dá pra desfazer.")) return;
    await fetch(`/api/admin/catalog-items/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Promoções</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Aparecem numa seção própria em /servicos e no orçamento — somem
            sozinhas quando a data final passa.
          </p>
        </div>
        {editing === null && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} className="mr-1.5" /> Nova promoção
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-6">
          <CatalogItemForm
            variant="promotion"
            initialItem={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        </div>
      )}

      {loadError && (
        <p className="mt-6 text-sm text-red-400">
          Não foi possível carregar as promoções agora.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {items.length === 0 && editing === null && (
          <p className="text-sm text-muted-dark">Nenhuma promoção criada ainda.</p>
        )}
        {items.map((item) => {
          const status = statusOf(item);
          const priceValues = Object.values(item.precos);
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background-secondary px-4 py-3.5"
            >
              <div>
                <p className="font-display font-bold text-foreground">{item.nome}</p>
                <p className="mt-0.5 text-xs text-muted-dark">
                  {getCategoryLabel(item.categoria)} · {item.veiculoTipo === "car" ? "Carro" : "Moto"}
                  {priceValues.length > 0 && ` · a partir de ${formatCurrency(Math.min(...priceValues))}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-dark">
                  {formatDatePtBr(item.promocaoInicio!)} até {formatDatePtBr(item.promocaoFim!)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={status.tone}>{status.label}</Badge>
                <button
                  onClick={() => setEditing(item)}
                  className="rounded-lg border border-border p-2 text-muted hover:border-gold hover:text-gold-light"
                  aria-label="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg border border-border p-2 text-muted hover:border-red-400 hover:text-red-400"
                  aria-label="Apagar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
