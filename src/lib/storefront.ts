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

