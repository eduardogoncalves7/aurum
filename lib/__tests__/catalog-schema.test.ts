import { describe, expect, it } from "vitest";
import { catalogCategorySchema, catalogItemSchema } from "@/lib/catalog-schema";

const validItem = {
  name: "Revestimento Cerâmico", slug: "revestimento-ceramico", category: "protecao",
  shortDescription: "Proteção para a pintura", description: null, vehicleType: "car",
  prices: { small: 1500, medium: 1800 }, variants: [{ id: "1-ano", label: "1 ano", prices: { small: 1500 } }],
  priceOptions: [{ title: "Kits", items: [{ name: "Frontal", price: 900 }] }],
  pricingType: "fixed", includes: ["Aplicação"],
  benefits: [], gifts: [], photos: ["/uploads/revestimento.webp"], active: true,
  visibleInCatalog: true, featured: false, displayOrder: 10,
  promotionStartsOn: null, promotionEndsOn: null, promotionWithoutDates: false, promotionalPrices: {},
};

describe("canonical catalog zod schema", () => {
  it("accepts a valid item and editable category", () => {
    expect(catalogItemSchema.parse(validItem)).toEqual(validItem);
    expect(catalogCategorySchema.parse({ id: "protecao", name: "Proteções", displayOrder: 20 })).toEqual({
      id: "protecao", name: "Proteções", displayOrder: 20,
    });
  });

  it("rejects malformed slug, negative price, and non-ISO date values", () => {
    expect(catalogItemSchema.safeParse({ ...validItem, slug: "Revestimento Cerâmico" }).success).toBe(false);
    expect(catalogItemSchema.safeParse({ ...validItem, prices: { small: -1 } }).success).toBe(false);
    expect(catalogItemSchema.safeParse({ ...validItem, promotionStartsOn: "05/10/2026" }).success).toBe(false);
    expect(catalogItemSchema.safeParse({ ...validItem, promotionStartsOn: "2026-10-10", promotionEndsOn: null }).success).toBe(false);
  });
});
