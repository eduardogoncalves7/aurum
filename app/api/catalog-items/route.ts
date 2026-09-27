import { NextResponse } from "next/server";
import { catalogItemToService, listPublicCatalogItems, listManagedCatalogIds, isPromotion } from "@/lib/catalog-items";

// Público, sem parâmetros — só devolve o que já passou pelo filtro de
// "ativo e dentro da janela de promoção" (ver lib/catalog-items.ts). Usado
// pela página /servicos e pelo fluxo de orçamento pra somar ao catálogo
// estático de lib/data/services.ts.
export async function GET() {
  try {
    const items = await listPublicCatalogItems();
    const managedIds = await listManagedCatalogIds();
    return NextResponse.json({
      services: items.map(catalogItemToService),
      promotionalIds: items.filter(isPromotion).map((i) => i.id),
      managedIds,
    });
  } catch (error) {
    console.error("Erro ao listar catálogo público:", error);
    return NextResponse.json({ services: [], promotionalIds: [] }, { status: 200 });
  }
}
