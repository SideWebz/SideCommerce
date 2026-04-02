import { prisma } from "@/lib/prisma";

export async function getVariantSummary(productId: string) {
  const [aggregate, variantCount] = await Promise.all([
    prisma.variant.aggregate({
      where: { productId },
      _min: { price: true },
      _max: { price: true },
      _sum: { stock: true },
    }),
    prisma.variant.count({ where: { productId } }),
  ]);

  return {
    pricingSource: "variants" as const,
    variantCount,
    priceMin: aggregate._min.price,
    priceMax: aggregate._max.price,
    totalStock: aggregate._sum.stock ?? 0,
  };
}
