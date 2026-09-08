import { serviceCategories } from "@/lib/data/categories";
import { services } from "@/lib/data/services";
import { ServiceCard } from "@/components/home/ServiceCard";

export function ServiceCategories({ featuredOnly = false }: { featuredOnly?: boolean }) {
  const list = featuredOnly ? services.filter((s) => s.featured) : services;

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
