"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog-items";
import { services as staticServices } from "@/lib/data/services";
import { getCategoryLabel } from "@/lib/data/categories";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CatalogItemForm } from "@/components/admin/CatalogItemForm";

function isPromotion(item: CatalogItem) {
  return !!(item.promocaoInicio && item.promocaoFim);
}

export default function AdminServicesPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);

  function reload() {
    fetch("/api/admin/catalog-items")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar");
        return res.json();
      })
      .then((data: { items: CatalogItem[] }) => setItems(data.items ?? []))
      .catch(() => setLoadError(true));
  }

  useEffect(reload, []);

  const services = items.filter((i) => !isPromotion(i));

  async function handleDelete(id: string) {
    if (!confirm("Apagar este serviço? Não dá pra desfazer.")) return;
    await fetch(`/api/admin/catalog-items/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Serviços</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Serviços criados aqui somam ao catálogo de fábrica (abaixo, só
            leitura) — aparecem em /servicos e no orçamento automaticamente.
          </p>
        </div>
        {editing === null && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} className="mr-1.5" /> Novo serviço
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-6">
          <CatalogItemForm
            variant="service"
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
        <p className="mt-6 text-sm text-red-400">Não foi possível carregar os serviços agora.</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {services.length === 0 && editing === null && (
          <p className="text-sm text-muted-dark">Nenhum serviço criado por aqui ainda.</p>
        )}
        {services.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background-secondary px-4 py-3.5"
          >
            <div>
              <p className="font-display font-bold text-foreground">{item.nome}</p>
              <p className="mt-0.5 text-xs text-muted-dark">
                {getCategoryLabel(item.categoria)}
                {item.subcategoria ? ` · ${item.subcategoria}` : ""} ·{" "}
                {item.veiculoTipo === "car" ? "Carro" : "Moto"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!item.ativo && <Badge tone="neutral">Inativo</Badge>}
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
        ))}
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-foreground">
        Catálogo de fábrica (código, só leitura)
      </h2>
      <p className="mt-1 text-xs text-muted-dark">
        Pra mudar isto aqui, edite lib/data/services.ts e faça um novo deploy.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {staticServices.map((service) => (
          <div
            key={service.id}
            className="rounded-xl border border-border bg-background-secondary/50 px-4 py-3"
          >
            <p className="font-medium text-foreground">{service.name}</p>
            <p className="mt-0.5 text-xs text-muted-dark">{getCategoryLabel(service.category)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
