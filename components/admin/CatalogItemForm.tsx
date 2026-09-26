"use client";

import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import type { CatalogItem, CatalogItemInput } from "@/lib/catalog-items";
import { serviceCategories } from "@/lib/data/categories";
import { ServiceCategoryId, VehicleType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CAR_PRICE_FIELDS: { key: string; label: string }[] = [
  { key: "hatch_sedan", label: "Hatch / Sedan (R$)" },
  { key: "suv", label: "SUV (R$)" },
  { key: "pickup", label: "Caminhonete (R$)" },
];
const MOTO_PRICE_FIELDS: { key: string; label: string }[] = [
  { key: "motorcycle", label: "Moto (R$)" },
];

interface FormState {
  nome: string;
  descricaoCurta: string;
  descricao: string;
  categoria: ServiceCategoryId;
  subcategoria: string;
  veiculoTipo: VehicleType;
  precos: Record<string, string>;
  includes: string[];
  foto: string | null;
  promocaoInicio: string;
  promocaoFim: string;
  ativo: boolean;
}

function toFormState(item?: CatalogItem): FormState {
  return {
    nome: item?.nome ?? "",
    descricaoCurta: item?.descricaoCurta ?? "",
    descricao: item?.descricao ?? "",
    categoria: item?.categoria ?? "especiais",
    subcategoria: item?.subcategoria ?? "",
    veiculoTipo: item?.veiculoTipo ?? "car",
    precos: Object.fromEntries(
      Object.entries(item?.precos ?? {}).map(([k, v]) => [k, String(v)])
    ),
    includes: item?.includes?.length ? item.includes : [""],
    foto: item?.foto ?? null,
    promocaoInicio: item?.promocaoInicio ?? "",
    promocaoFim: item?.promocaoFim ?? "",
    ativo: item?.ativo ?? true,
  };
}

export function CatalogItemForm({
  variant,
  initialItem,
  onSaved,
  onCancel,
}: {
  variant: "service" | "promotion";
  initialItem?: CatalogItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialItem));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceFields = form.veiculoTipo === "car" ? CAR_PRICE_FIELDS : MOTO_PRICE_FIELDS;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.");
      setForm((f) => ({ ...f, foto: data.path }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const precos: Record<string, number> = {};
    for (const field of priceFields) {
      precos[field.key] = Number(form.precos[field.key] ?? 0);
    }

    const payload: CatalogItemInput = {
      nome: form.nome,
      descricaoCurta: form.descricaoCurta,
      descricao: form.descricao || null,
      categoria: form.categoria,
      subcategoria: form.subcategoria || null,
      veiculoTipo: form.veiculoTipo,
      precos,
      includes: form.includes.map((i) => i.trim()).filter(Boolean),
      foto: form.foto,
      promocaoInicio: variant === "promotion" ? form.promocaoInicio || null : null,
      promocaoFim: variant === "promotion" ? form.promocaoFim || null : null,
      ativo: form.ativo,
    };

    try {
      const res = await fetch(
        initialItem ? `/api/admin/catalog-items/${initialItem.id}` : "/api/admin/catalog-items",
        {
          method: initialItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background-secondary p-5"
    >
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome"
          value={form.nome}
          maxLength={120}
          required
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Categoria</label>
          <select
            value={form.categoria}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoria: e.target.value as ServiceCategoryId }))
            }
            className="h-12 w-full rounded-lg border border-border bg-background-elevated px-4 text-foreground"
          >
            {serviceCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Subcategoria (opcional)"
          value={form.subcategoria}
          maxLength={60}
          onChange={(e) => setForm((f) => ({ ...f, subcategoria: e.target.value }))}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Veículo</label>
          <div className="flex gap-2">
            {(["car", "motorcycle"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setForm((f) => ({ ...f, veiculoTipo: tipo }))}
                className={`h-12 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  form.veiculoTipo === tipo
                    ? "border-gold bg-gold/10 text-gold-light"
                    : "border-border text-muted"
                }`}
              >
                {tipo === "car" ? "Carro" : "Moto"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Input
        label="Descrição curta (aparece no card)"
        value={form.descricaoCurta}
        maxLength={200}
        required
        onChange={(e) => setForm((f) => ({ ...f, descricaoCurta: e.target.value }))}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted">
          Descrição completa (opcional)
        </label>
        <textarea
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-border bg-background-elevated px-4 py-3 text-foreground"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted">
          Preço por categoria de veículo
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {priceFields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type="number"
              min={0}
              step="0.01"
              required
              value={form.precos[field.key] ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  precos: { ...f.precos, [field.key]: e.target.value },
                }))
              }
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted">Itens inclusos</label>
        <div className="flex flex-col gap-2">
          {form.includes.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={item}
                maxLength={120}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    includes: f.includes.map((v, i) => (i === idx ? e.target.value : v)),
                  }))
                }
                className="h-11 flex-1 rounded-lg border border-border bg-background-elevated px-3 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, includes: f.includes.filter((_, i) => i !== idx) }))
                }
                className="rounded-lg border border-border px-2.5 text-muted hover:text-red-400"
                aria-label="Remover item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, includes: [...f.includes, ""] }))}
            className="flex items-center gap-1.5 self-start text-xs text-gold hover:text-gold-light"
          >
            <Plus size={14} /> Adicionar item
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted">Foto</label>
        <div className="flex items-center gap-3">
          {form.foto && (
            // eslint-disable-next-line @next/next/no-img-element -- preview de upload recém-feito, não precisa de otimização do next/image
            <img
              src={form.foto}
              alt=""
              className="h-16 w-16 rounded-lg border border-border object-cover"
            />
          )}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:border-gold hover:text-gold-light">
            <Upload size={14} />
            {uploading ? "Enviando..." : "Escolher foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {variant === "promotion" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Início da promoção"
            type="date"
            required
            value={form.promocaoInicio}
            onChange={(e) => setForm((f) => ({ ...f, promocaoInicio: e.target.value }))}
          />
          <Input
            label="Fim da promoção"
            type="date"
            required
            value={form.promocaoFim}
            onChange={(e) => setForm((f) => ({ ...f, promocaoFim: e.target.value }))}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
        />
        Ativo (visível no site)
      </label>

      <div className="mt-2 flex gap-3">
        <Button type="submit" disabled={saving || uploading}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
