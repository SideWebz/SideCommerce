import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { CheckoutForm } from "@/components/checkout-form";
import {
  getStoreByDomain,
  getStorefrontShippingRegions,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

export default async function CheckoutPage() {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    notFound();
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    notFound();
  }

  const shippingRegions = await getStorefrontShippingRegions(store.id);

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-5">
        <CheckoutForm shippingRegions={shippingRegions} />
      </main>
    </>
  );
}
