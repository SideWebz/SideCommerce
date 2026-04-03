import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { CartView } from "@/components/cart-view";
import {
  getStoreByDomain,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

export default async function CartPage() {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    notFound();
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    notFound();
  }

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-5">
        <CartView />
      </main>
    </>
  );
}
