import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import {
  getStoreByDomain,
  getStorefrontProducts,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function StorefrontCategoryPage({ params }: Params) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    notFound();
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    notFound();
  }

  const products = await getStorefrontProducts(store.id);
  const categoryMap = new Map<string, string>();

  for (const product of products) {
    for (let index = 0; index < product.categoryIds.length; index += 1) {
      const categoryId = product.categoryIds[index];
      const categoryName = product.categoryNames[index] ?? categoryId;
      categoryMap.set(categoryId, categoryName);
    }
  }

  const { id } = await params;

  if (!categoryMap.has(id)) {
    notFound();
  }

  const categories = Array.from(categoryMap.entries())
    .map(([categoryId, name]) => ({ id: categoryId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const categoryName = categoryMap.get(id) ?? "Category";

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-4 py-md-5">
        <StorefrontProductGrid
          products={products}
          categories={categories}
          heading={categoryName}
          subheading="Browse this category and refine by brand, category, search, and price."
          initialCategoryIds={[id]}
        />
      </main>
    </>
  );
}
