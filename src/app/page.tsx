import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getStoreByDomain,
  getStorefrontProducts,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

export default async function HomePage() {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  // ── Platform domain → admin backend ──────────────────────────────────────
  if (isPlatformDomain(domain)) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = await getUserFromSessionToken(sessionToken);

    if (!user) {
      redirect("/login");
    }

    return (
      <>
        <Navbar active="orders" />
        <main className="container py-5">
          <div className="mb-4">
            <h1 className="h3 mb-1">Orders</h1>
            <p className="text-secondary mb-0">All placed orders will appear here.</p>
          </div>
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              <p className="mb-0">No orders yet.</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Custom domain → storefront ────────────────────────────────────────────
  const store = await getStoreByDomain(domain);

  if (!store) {
    return (
      <main className="container py-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-5 text-center">
            <h1 className="h3 mb-2">SideCommerce</h1>
            <p className="text-secondary mb-4">
              Build and run your online shop from one platform.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Link href="/register" className="btn btn-dark">Create a new shop</Link>
              <Link href="/login" className="btn btn-outline-secondary">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const products = await getStorefrontProducts(store.id);

  // Derive categories directly from loaded products — avoids a second DB
  // query and guarantees the category list is consistent with displayed products.
  const categoryMap = new Map<string, string>();
  for (const p of products) {
    for (let i = 0; i < p.categoryIds.length; i++) {
      categoryMap.set(p.categoryIds[i], p.categoryNames[i] ?? p.categoryIds[i]);
    }
  }
  const categories = Array.from(categoryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-5">
        {products.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              No products available yet.
            </div>
          </div>
        ) : (
          <StorefrontProductGrid products={products} categories={categories} />
        )}
      </main>
    </>
  );
}

