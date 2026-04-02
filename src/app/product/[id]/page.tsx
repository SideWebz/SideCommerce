import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { StorefrontProductDetail } from "@/components/storefront-product-detail";
import {
  getStoreByDomain,
  getStorefrontProduct,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function StorefrontProductPage({ params }: Params) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    notFound();
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    notFound();
  }

  const { id } = await params;
  const product = await getStorefrontProduct(store.id, id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-5">
        <StorefrontProductDetail product={product} />
      </main>
    </>
  );
}
