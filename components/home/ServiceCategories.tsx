import { serviceCategories } from "@/lib/data/categories";
import { services as staticServices } from "@/lib/data/services";
import { ServiceCard } from "@/components/home/ServiceCard";
import { Service } from "@/types";

export function ServiceCategories({
  featuredOnly = false,
  services = staticServices,
  promotionalServices = [],
}: {
  featuredOnly?: boolean;
  /** Catálogo completo a exibir — por padrão só o estático, mas a página
   * /servicos passa o estático + itens ativos do banco somados. */
  services?: Service[];
  /** Promoções em vigor (itens do banco com data de início/fim), exibidas
   * numa seção própria antes das categorias normais. */
  promotionalServices?: Service[];
}) {
  const visible = services.filter((s) => !s.hiddenFromCatalog);
  const list = featuredOnly ? visible.filter((s) => s.featured) : visible;

  if (featuredOnly) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14">
      {promotionalServices.length > 0 && (
        <section id="promocoes" className="scroll-mt-24">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-extrabold text-gold-light sm:text-3xl">
              Promoções
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Por tempo limitado.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {promotionalServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}

      {serviceCategories.map((category) => {
        const categoryServices = list.filter((s) => s.category === category.id);
        if (categoryServices.length === 0) return null;
        return (
          <section key={category.id} id={category.id} className="scroll-mt-24">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                {category.label}
              </h2>
              {category.description && (
                <p className="mt-1.5 max-w-xl text-sm text-muted">
                  {category.description}
                </p>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
