import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Navbar } from "@/components/navbar";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { OrdersListAdmin } from "@/components/orders-list-admin";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStoreByDomain,
  type StorefrontProductItem,
  getStorefrontProducts,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

function formatPrice(prices: number[], productType: string, simplePrice: number | null) {
  const fmt = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);

  if (productType === "VARIABLE" && prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? fmt(min) : `${fmt(min)} - ${fmt(max)}`;
  }

  return fmt(simplePrice ?? 0);
}

function FeaturedProductRow({ title, products }: { title: string; products: StorefrontProductItem[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="d-grid gap-3 storefront-reveal">
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="h5 mb-0">{title}</h2>
      </div>
      <div className="storefront-featured-row">
        {products.map((product) => (
          <Link key={product.id} href={`/product/${product.id}`} className="text-decoration-none">
            <article className="card border-0 shadow-sm storefront-featured-card">
              <div className="product-card-image-wrapper border-bottom bg-light-subtle">
                {product.imagePath ? (
                  <img src={product.imagePath} alt={product.name} className="product-card-image" />
                ) : (
                  <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary small">
                    No image
                  </div>
                )}
              </div>
              <div className="card-body d-grid gap-1">
                <h3 className="h6 mb-0 text-truncate text-dark" title={product.name}>
                  {product.name}
                </h3>
                <div className="small text-secondary text-truncate" title={product.brand}>
                  {product.brand}
                </div>
                <div className="fw-semibold text-dark">
                  {formatPrice(product.variantPrices, product.productType, product.price)}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  // ── Platform domain → admin backend ──────────────────────────────────────
  if (isPlatformDomain(domain)) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = await getUserFromSessionToken(sessionToken);

    if (!user) {
      return (
        <>
          <Navbar active="orders" />
          <main className="container py-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-5 text-center">
                <h1 className="h3 mb-2">Welcome to SideCommerce</h1>
                <p className="text-secondary mb-4">Sign in to manage your orders and store settings.</p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <Link href="/login" className="btn btn-dark">Sign in</Link>
                  <Link href="/register" className="btn btn-outline-secondary">Create account</Link>
                </div>
              </div>
            </div>
          </main>
        </>
      );
    }

    const store = await prisma.store.findUnique({ where: { userId: user.id } });

    return (
      <>
        <Navbar active="orders" />
        <main className="container py-5">
          {!store ? (
            <>
              <div className="mb-4">
                <h1 className="h3 mb-1">Orders</h1>
                <p className="text-secondary mb-0">Set up your store to receive orders.</p>
              </div>
              <div className="card border-0 shadow-sm">
                <div className="card-body p-5 text-center text-secondary">
                  <p className="mb-0">No store found.</p>
                </div>
              </div>
            </>
          ) : (
            <OrdersListAdmin storeName={store.name} />
          )}
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

  const newestProducts = [...products].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ).slice(0, 8);

  const popularProducts = [...products]
    .sort((a, b) => {
      const stockA = a.productType === "VARIABLE" ? a.variantStockTotal : (a.stock ?? 0);
      const stockB = b.productType === "VARIABLE" ? b.variantStockTotal : (b.stock ?? 0);
      return stockB - stockA;
    })
    .slice(0, 8);

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-4 py-md-5 d-grid gap-4 gap-md-5 storefront-main-shell">
        {products.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              No products available yet.
            </div>
          </div>
        ) : (
          <>
            <section className="card border-0 shadow-sm overflow-hidden storefront-hero-card storefront-reveal">
              <div className="card-body p-4 p-md-5">
                <div className="row g-4 align-items-center">
                  <div className="col-lg-7">
                    <span className="badge rounded-pill text-bg-light border mb-3">New season selection</span>
                    <h1 className="display-6 fw-semibold mb-2">Discover products you will love</h1>
                    <p className="text-secondary mb-3 mb-md-4">
                      Shop by category, search by brand or product name, and use smart filters to find the perfect match.
                    </p>
                    <a href="#shop-all" className="btn btn-dark btn-lg">
                      Start browsing
                    </a>
                  </div>
                  <div className="col-lg-5">
                    <div className="storefront-hero-metrics">
                      <div className="storefront-hero-metric-card">
                        <div className="small text-secondary">Products</div>
                        <div className="h4 mb-0">{products.length}</div>
                      </div>
                      <div className="storefront-hero-metric-card">
                        <div className="small text-secondary">Categories</div>
                        <div className="h4 mb-0">{categories.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {categories.length > 0 && (
              <section className="d-grid gap-3 storefront-reveal">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="h5 mb-0">Shop by category</h2>
                </div>
                <div className="storefront-category-strip" role="list" aria-label="Product categories">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.id}`}
                      className="storefront-category-chip"
                      role="listitem"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <FeaturedProductRow title="Newest products" products={newestProducts} />

            {popularProducts.length > 0 && (
              <FeaturedProductRow title="Popular products" products={popularProducts} />
            )}

            <section id="shop-all" className="d-grid gap-3 storefront-reveal">
              <StorefrontProductGrid
                products={products}
                categories={categories}
                heading="Shop all products"
                subheading="Use search and filters to narrow your results in seconds."
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}

