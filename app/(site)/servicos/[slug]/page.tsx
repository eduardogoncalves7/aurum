import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Gift } from "lucide-react";
import { getServiceById, services } from "@/lib/data/services";
import { getCategoryLabel } from "@/lib/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { getServiceDisplayPrice } from "@/lib/pricing";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceImage } from "@/components/home/ServiceImage";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.id }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceById(slug);
  if (!service) notFound();

  const { value, isRange } = getServiceDisplayPrice(service);
  const isEstimateOnly = service.pricingType === "starting_at";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/servicos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft size={16} /> Voltar ao catálogo
      </Link>

      <Badge tone="gold">{getCategoryLabel(service.category)}</Badge>
      <h1 className="mt-3 font-display text-3xl font-black text-foreground sm:text-4xl">
        {service.name}
      </h1>

      <div className="mt-5 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-background-elevated">
        <ServiceImage service={service} />
      </div>

      <p className="mt-5 max-w-2xl text-muted">
        {service.description ?? service.shortDescription}
      </p>

      <div className="mt-6 flex items-end gap-3">
        <div>
          <p className="text-xs text-muted-dark">
            {isEstimateOnly ? "Estimativa" : isRange ? "A partir de" : "Valor"}
          </p>
          <p className="font-display text-3xl font-extrabold text-gold-light">
            {formatCurrency(value)}
          </p>
        </div>
        <Link href={`/orcamento?service=${service.id}`}>
          <Button size="lg">Adicionar ao orçamento</Button>
        </Link>
      </div>

      {service.note && (
        <p className="mt-4 max-w-xl rounded-lg border border-border bg-background-secondary px-4 py-3 text-sm text-muted">
          {service.note}
        </p>
      )}

      {/* Preços por porte/carroceria */}
      {service.prices && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            Preços
          </h2>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {Object.entries(service.prices).map(([category, price]) => (
              <div
                key={category}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-muted">{priceCategoryLabel(category)}</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(price as number)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Variantes (ex: proteção cerâmica por anos) */}
      {service.variants && (
        <section className="mt-10 flex flex-col gap-6">
          <h2 className="font-display text-lg font-bold text-foreground">
            Pacotes disponíveis
          </h2>
          {service.variants.map((variant) => (
            <div
              key={variant.id}
              className="rounded-xl border border-border p-5"
            >
              <h3 className="font-display font-bold text-gold-light">
                {variant.label}
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {Object.entries(variant.prices ?? {}).map(([category, price]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-lg bg-background-elevated px-3 py-2 text-sm"
                  >
                    <span className="text-muted">
                      {priceCategoryLabel(category)}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(price as number)}
                    </span>
                  </div>
                ))}
              </div>
              {variant.gift && variant.gift.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variant.gift.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs text-gold-light"
                    >
                      <Gift size={12} /> {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {service.benefits && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            Benefícios
          </h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {service.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {service.includes && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            O que está incluído
          </h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {service.includes.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                {i}
              </li>
            ))}
          </ul>
        </section>
      )}

      {service.gift && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground">
            Brinde
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {service.gift.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs text-gold-light"
              >
                <Gift size={12} /> {g}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 border-t border-border pt-8">
        <Link href={`/orcamento?service=${service.id}`}>
          <Button size="lg" className="w-full sm:w-auto">
            Adicionar ao orçamento
          </Button>
        </Link>
      </div>
    </div>
  );
}

function priceCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    small: "Carro pequeno",
    medium: "Carro médio",
    large: "Carro grande",
    hatch_sedan: "Hatch / Sedan",
    suv: "SUV",
    pickup: "Caminhonete",
    motorcycle: "Moto",
  };
  return labels[category] ?? category;
}
