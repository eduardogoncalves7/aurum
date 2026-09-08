import Link from "next/link";
import { Service } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/formatters";
import { getServiceDisplayPrice } from "@/lib/pricing";

export function ServiceCard({ service }: { service: Service }) {
  const { value, isRange } = getServiceDisplayPrice(service);
  const isEstimateOnly = service.pricingType === "starting_at";

  return (
    <Card className="group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:border-border-strong">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-background-elevated">
        <div
          className="h-full w-full bg-gradient-to-br from-gold/15 via-background-elevated to-background"
          aria-hidden
        />
        {service.featured && (
          <Badge tone="gold" className="absolute left-3 top-3">
            Mais procurado
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {service.name}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {service.shortDescription}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div>
            <p className="text-xs text-muted-dark">
              {isEstimateOnly ? "Estimativa" : isRange ? "A partir de" : "Valor"}
            </p>
            <p className="font-display text-lg font-extrabold text-gold-light">
              {formatCurrency(value)}
            </p>
          </div>
          <Link
            href={`/servicos/${service.id}`}
            className="text-sm font-semibold text-gold underline-offset-4 hover:underline"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </Card>
  );
}
