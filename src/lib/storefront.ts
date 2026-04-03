import { prisma } from "@/lib/prisma";

const DEFAULT_PLATFORM_DOMAINS = new Set(["localhost", "127.0.0.1"]);

export function normalizeDomainFromHost(host: string) {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0] ?? "";
  return withoutPort.replace(/\.$/, "");
}

export function isPlatformDomain(domain: string) {
  if (!domain) {
    return true;
  }

  const configuredPlatformDomains = (process.env.PLATFORM_DOMAINS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (configuredPlatformDomains.includes(domain)) {
    return true;
  }

  if (DEFAULT_PLATFORM_DOMAINS.has(domain)) {
    return true;
  }

  return domain.endsWith(".localhost");
}

export function getAuthRedirectTarget(hostHeader: string | null) {
  const domain = normalizeDomainFromHost(hostHeader ?? "");
  if (isPlatformDomain(domain)) {
    return "/";
  }

  return process.env.ADMIN_BASE_URL?.trim() || "http://localhost:3000";
}

/**
 * Resolves a store by its custom domain.
 */
export async function getStoreByDomain(domain: string) {
  if (!domain) return null;

  try {
    return await prisma.store.findFirst({ where: { domain } });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Storefront data queries – public, scoped by storeId
// ---------------------------------------------------------------------------

export type StorefrontProductItem = {
  id: string;
  name: string;
  brand: string;
  productType: "SIMPLE" | "VARIABLE";
  price: number | null;
  stock: number | null;
  imagePath: string | null;
  variantPrices: number[];
  variantStockTotal: number;
  categoryIds: string[];
  categoryNames: string[];
};

export type StorefrontCategory = {
  id: string;
  name: string;
};

export type StorefrontShippingRegion = {
  id: string;
  country: string;
  shippingCost: number;
  freeShippingFrom: number | null;
};

export type StorefrontProductDetail = {
  id: string;
  name: string;
  brand: string;
  description: string;
  productType: "SIMPLE" | "VARIABLE";
  price: number | null;
  stock: number | null;
  images: { id: string; filePath: string }[];
  variants: { id: string; name: string; price: number; stock: number }[];
  categories: { id: string; name: string }[];
  linkedProducts: { id: string; name: string; imagePath: string | null }[];
};

export async function getStorefrontProducts(storeId: string): Promise<StorefrontProductItem[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { storeId },
      include: {
        variants: true,
        images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 1 },
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      productType: p.productType,
      price: p.price === null ? null : Number(p.price),
      stock: p.stock,
      imagePath: p.images[0]?.filePath ?? null,
      variantPrices: p.variants.map((v) => Number(v.price)),
      variantStockTotal: p.variants.reduce((sum, v) => sum + v.stock, 0),
      categoryIds: p.categories.map((c) => c.categoryId),
      categoryNames: p.categories.map((c) => c.category.name),
    }));
  } catch {
    return [];
  }
}

export async function getStorefrontCategories(storeId: string): Promise<StorefrontCategory[]> {
  try {
    const rows = await prisma.category.findMany({
      where: { products: { some: { product: { storeId } } } },
      orderBy: { name: "asc" },
    });
    return rows.map((c) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

export async function getStorefrontShippingRegions(storeId: string): Promise<StorefrontShippingRegion[]> {
  try {
    const rows = await prisma.shippingRegion.findMany({
      where: { storeId },
      orderBy: { country: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      country: row.country,
      shippingCost: Number(row.shippingCost),
      freeShippingFrom: row.freeShippingFrom === null ? null : Number(row.freeShippingFrom),
    }));
  } catch {
    return [];
  }
}

export async function getStorefrontProduct(
  storeId: string,
  productId: string,
): Promise<StorefrontProductDetail | null> {
  try {
    const p = await prisma.product.findFirst({
      where: { id: productId, storeId },
      include: {
        variants: { orderBy: { name: "asc" } },
        images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        categories: { include: { category: true } },
        outgoingLinks: {
          include: {
            linkedProduct: {
              include: {
                images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 1 },
              },
            },
          },
        },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      description: p.description,
      productType: p.productType,
      price: p.price === null ? null : Number(p.price),
      stock: p.stock,
      images: p.images.map((img) => ({ id: img.id, filePath: img.filePath })),
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        stock: v.stock,
      })),
      categories: p.categories.map((c) => ({ id: c.categoryId, name: c.category.name })),
      linkedProducts: p.outgoingLinks.map((l) => ({
        id: l.linkedProduct.id,
        name: l.linkedProduct.name,
        imagePath: l.linkedProduct.images[0]?.filePath ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export type StorefrontOrder = {
  id: string;
  status: string;
  trackingCode: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  createdAt: Date;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

export type StorefrontCartAvailability = {
  productId: string;
  variantId: string | null;
  availableStock: number;
  itemLabel: string;
};

export async function getStorefrontCartAvailability(
  storeId: string,
  items: Array<{ productId: string; variantId: string | null }>,
): Promise<StorefrontCartAvailability[]> {
  if (items.length === 0) {
    return [];
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const variantIds = [...new Set(items.flatMap((item) => (item.variantId ? [item.variantId] : [])))];

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    const variants = variantIds.length > 0
      ? await prisma.variant.findMany({
          where: {
            id: { in: variantIds },
            product: { storeId },
          },
          select: {
            id: true,
            name: true,
            stock: true,
            productId: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

    const productsById = new Map(products.map((product) => [product.id, product]));
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    return items.map((item) => {
      if (item.variantId) {
        const variant = variantsById.get(item.variantId);
        if (!variant) {
          const productName = productsById.get(item.productId)?.name ?? "Item";
          return {
            productId: item.productId,
            variantId: item.variantId,
            availableStock: 0,
            itemLabel: productName,
          };
        }

        return {
          productId: item.productId,
          variantId: item.variantId,
          availableStock: variant.stock,
          itemLabel: `${variant.product.name} - ${variant.name}`,
        };
      }

      const product = productsById.get(item.productId);
      return {
        productId: item.productId,
        variantId: null,
        availableStock: product?.stock ?? 0,
        itemLabel: product?.name ?? "Item",
      };
    });
  } catch {
    return items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      availableStock: 0,
      itemLabel: "Item",
    }));
  }
}

export async function getStorefrontOrder(
  storeId: string,
  orderId: string,
): Promise<StorefrontOrder | null> {
  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
      include: { items: true },
    });

    if (!order) return null;

    return {
      id: order.id,
      status: order.status,
      trackingCode: order.trackingCode,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  } catch {
    return null;
  }
}
