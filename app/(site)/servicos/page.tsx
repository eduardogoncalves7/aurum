import Link from "next/link";
import { ServiceCategories } from "@/components/home/ServiceCategories";
import { serviceCategories } from "@/lib/data/categories";
import { services as staticServices } from "@/lib/data/services";
import { catalogItemToService, isPromotion, listPublicCatalogItems } from "@/lib/catalog-items";

// Sem isso, o Next.js pré-renderizaria esta página uma vez no build e os
// itens criados depois no /admin (serviços e promoções) só apareceriam no
// próximo deploy. O tráfego deste site não justifica cache aqui.
export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  // Itens do banco (criados no /admin) somam ao catálogo estático — nunca o
  // substituem. Se o banco falhar por qualquer motivo, listPublicCatalogItems
  // já devolve [] (ver catch lá dentro), então o catálogo estático continua
  // funcionando normalmente mesmo assim.
  const dbItems = await listPublicCatalogItems().catch((error) => {
    console.error("Erro ao carregar itens de catálogo do banco:", error);
    return [];
  });

  const promotionalServices = dbItems.filter(isPromotion).map(catalogItemToService);
  const regularDbServices = dbItems.filter((i) => !isPromotion(i)).map(catalogItemToService);
  const allServices = [...staticServices, ...regularDbServices];

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
        {promotionalServices.length > 0 && (
          <a
            href="#promocoes"
            className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold-light transition-colors hover:bg-gold/20"
          >
            Promoções
          </a>
        )}
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

      <ServiceCategories services={allServices} promotionalServices={promotionalServices} />

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
