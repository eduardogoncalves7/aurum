import { ServiceCategories } from "@/components/home/ServiceCategories";
import { serviceCategories } from "@/lib/data/categories";
import Link from "next/link";

export default function ServicosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-4">
        <h1 className="font-display text-4xl font-black text-foreground">
          Nossos serviços
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Catálogo completo de detalhamento automotivo. Escolha os serviços e
          monte seu orçamento — sem cadastro, sem senha.
        </p>
      </div>

      <div className="scrollbar-thin -mx-4 mb-10 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        {serviceCategories.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-gold hover:text-gold"
          >
            {c.label}
          </a>
        ))}
      </div>

      <ServiceCategories />

      <div className="mt-14 rounded-2xl border border-border bg-background-secondary p-6 text-center sm:p-8">
        <p className="text-muted">
          Selecionou os serviços que quer? Monte seu orçamento agora.
        </p>
        <Link
          href="/orcamento"
          className="mt-4 inline-block rounded-lg bg-gold px-6 py-3 font-semibold text-background hover:bg-gold-light"
        >
          Montar orçamento
        </Link>
      </div>
    </div>
  );
}
