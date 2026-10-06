import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const pricesSchema = z.record(z.string().trim().min(1), z.number().finite().nonnegative());
const variantSchema = z.object({
  id: nonEmptyText,
  label: nonEmptyText,
  prices: pricesSchema.optional(),
  gift: z.array(nonEmptyText).optional(),
});
const priceOptionSchema = z.object({
  title: nonEmptyText,
  items: z.array(z.object({
    name: nonEmptyText,
    price: z.number().finite().nonnegative(),
    isEstimate: z.boolean().optional(),
  })),
});

/** Canonical catalog shape; service_data remains as a legacy read source. */
export const catalogItemSchema = z.object({
  name: nonEmptyText,
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: nonEmptyText,
  shortDescription: nonEmptyText,
  description: z.string().nullable(),
  vehicleType: z.enum(["car", "motorcycle"]),
  prices: pricesSchema,
  variants: z.array(variantSchema),
  priceOptions: z.array(priceOptionSchema),
  pricingType: z.enum(["fixed", "starting_at"]),
  includes: z.array(nonEmptyText),
  benefits: z.array(nonEmptyText),
  gifts: z.array(nonEmptyText),
  photos: z.array(z.string().trim().min(1)),
  active: z.boolean(),
  visibleInCatalog: z.boolean(),
  featured: z.boolean(),
  displayOrder: z.number().int(),
  promotionStartsOn: z.string().date().nullable(),
  promotionEndsOn: z.string().date().nullable(),
  promotionWithoutDates: z.boolean(),
  promotionalPrices: pricesSchema,
}).superRefine((item, context) => {
  if (item.promotionWithoutDates && (item.promotionStartsOn !== null || item.promotionEndsOn !== null)) {
    context.addIssue({ code: "custom", path: ["promotionWithoutDates"], message: "Promoção sem prazo não pode ter datas." });
  } else if (!item.promotionWithoutDates && (item.promotionStartsOn === null) !== (item.promotionEndsOn === null)) {
    context.addIssue({ code: "custom", path: ["promotionEndsOn"], message: "Informe as duas datas ou deixe ambas vazias." });
  } else if (!item.promotionWithoutDates && item.promotionStartsOn && item.promotionEndsOn && item.promotionEndsOn < item.promotionStartsOn) {
    context.addIssue({ code: "custom", path: ["promotionEndsOn"], message: "A data final deve ser igual ou posterior à inicial." });
  }
});

export const catalogCategorySchema = z.object({
  id: nonEmptyText,
  name: nonEmptyText,
  displayOrder: z.number().int(),
});

export type CatalogItemModel = z.infer<typeof catalogItemSchema>;
export type CatalogCategoryModel = z.infer<typeof catalogCategorySchema>;
