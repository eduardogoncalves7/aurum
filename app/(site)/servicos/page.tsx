import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import { ServiceCategories } from "@/components/home/ServiceCategories";
import { serviceCategories } from "@/lib/data/categories";
import { services as staticServices } from "@/lib/data/services";
import { catalogItemToService, isPromotion, listPublicCatalogItems } from "@/lib/catalog-items";
import { readSiteSettings } from "@/lib/site-settings";
import { getSiteUrl } from "@/lib/site-url";
import { getInstagramUrl } from "@/lib/instagram";

// Sem isso, o Next.js pré-renderizaria esta página uma vez no build e os
// itens criados depois no /admin (serviços e promoções) só apareceriam no
// próximo deploy. O tráfego deste site não justifica cache aqui.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "Estética automotiva e lava-jato em Coronel Fabriciano",
  "Aurum Detailing: estética automotiva em Coronel Fabriciano, no Vale do Aço. Lavagem técnica, higienização, polimento e proteção automotiva. Peça seu orçamento online.",
  "/servicos"
);

export default async function ServicosPage() {
  // Itens do banco (criados no /admin) somam ao catálogo estático — nunca o
  // substituem. Se o banco falhar por qualquer motivo, listPublicCatalogItems
  // já devolve [] (ver catch lá dentro), então o catálogo estático continua
  // funcionando normalmente mesmo assim.
  const [dbItems, config] = await Promise.all([
    listPublicCatalogItems().catch((error) => {
      console.error("Erro ao carregar itens de catálogo do banco:", error);
      return null;
    }),
    readSiteSettings(),
  ]);

  const promotionalServices = (dbItems ?? []).filter(isPromotion).map(catalogItemToService);
  const regularDbServices = (dbItems ?? []).filter((i) => !isPromotion(i)).map(catalogItemToService);
  const allServices = dbItems ? regularDbServices : staticServices;
  const localBusiness = buildLocalBusinessJsonLd(config.address, config.phone, config.instagram);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      {localBusiness && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness).replace(/</g, "\\u003c") }}
        />
      )}
      <div className="mb-4">
        <h1 className="font-display text-4xl font-black text-foreground">
          Estética automotiva e lava-jato em Coronel Fabriciano
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          A Aurum Detailing é um centro de estética automotiva em Coronel Fabriciano,
          no Vale do Aço. Se você procura um lava-jato em Fabriciano, conheça as
          opções de lavagem técnica, higienização interna, polimento e proteção
          automotiva. Escolha os serviços e monte seu orçamento online, sem cadastro.
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

function buildLocalBusinessJsonLd(address: string, phone: string, instagram: string) {
  const parts = address.split(",").map((part) => part.trim());
  const postalCode = parts.at(-1)?.match(/^\d{5}-?\d{3}$/)?.[0];
  const cityRegion = parts.at(-2)?.match(/^(.+?)\s+-\s+([A-Z]{2})$/);

  // O endereço é editável no admin. Só publique schema quando pudermos
  // identificar os campos com segurança, sem inferir cidade ou CEP.
  const addressLocality = cityRegion?.[1];
  const addressRegion = cityRegion?.[2];
  const streetAddress = parts.slice(0, postalCode ? -2 : -1).join(", ");
  const postalAddress = addressLocality && addressRegion && streetAddress
    ? {
        "@type": "PostalAddress",
        streetAddress,
        addressLocality,
        addressRegion,
        addressCountry: "BR",
        ...(postalCode ? { postalCode } : {}),
      }
    : undefined;

  if (!postalAddress) return null;

  const instagramUrl = getInstagramUrl(instagram);
  return {
    "@context": "https://schema.org",
    "@type": "AutoWash",
    "@id": `${getSiteUrl()}/servicos#local-business`,
    name: "Aurum Detailing",
    description: "Estética automotiva, lavagem técnica, higienização, polimento e proteção automotiva em Coronel Fabriciano, no Vale do Aço.",
    url: `${getSiteUrl()}/servicos`,
    telephone: `+${phone.replace(/\D/g, "")}`,
    address: postalAddress,
    sameAs: ["https://www.google.com/maps?cid=9155090932068419585", ...(instagramUrl ? [instagramUrl] : [])],
  };
}
