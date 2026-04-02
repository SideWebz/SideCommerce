"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StorefrontProductItem, StorefrontCategory } from "@/lib/storefront";

type SortDirection = "none" | "asc" | "desc";

function formatPrice(prices: number[], productType: string, simplePrice: number | null) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

  if (productType === "VARIABLE" && prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }

  return fmt(simplePrice ?? 0);
}

function getDisplayStock(p: StorefrontProductItem) {
  if (p.productType === "VARIABLE") {
    return p.variantStockTotal;
  }
  return p.stock ?? 0;
}

type Props = {
  products: StorefrontProductItem[];
  categories: StorefrontCategory[];
};

export function StorefrontProductGrid({ products, categories }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [priceSort, setPriceSort] = useState<SortDirection>("none");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (normalizedQuery && !product.name.toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.every((id) => product.categoryIds.includes(id))) {
        return false;
      }

      return true;
    });

    const getDisplayPrice = (product: StorefrontProductItem) => {
      if (product.productType === "VARIABLE") {
        if (product.variantPrices.length > 0) {
          return Math.min(...product.variantPrices);
        }
        return product.price ?? 0;
      }

      return product.price ?? (product.variantPrices.length > 0 ? Math.min(...product.variantPrices) : 0);
    };

    filtered.sort((a, b) => {
      if (priceSort !== "none") {
        const priceA = getDisplayPrice(a);
        const priceB = getDisplayPrice(b);
        if (priceA !== priceB) {
          return priceSort === "asc" ? priceA - priceB : priceB - priceA;
        }
      }

      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [priceSort, products, searchQuery, selectedCategoryIds]);

  return (
    <div className="row g-4">
      {/* Sidebar */}
      <div className="col-lg-3">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3 d-grid gap-3">
            <div>
              <label className="form-label fw-semibold" htmlFor="sf-search">
                Search
              </label>
              <input
                id="sf-search"
                className="form-control"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label fw-semibold" htmlFor="sf-price-sort">
                Sort by price
              </label>
              <select
                id="sf-price-sort"
                className="form-select"
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as SortDirection)}
              >
                <option value="none">No sorting</option>
                <option value="asc">Low to high</option>
                <option value="desc">High to low</option>
              </select>
            </div>

            {categories.length > 0 && (
              <div>
                <div className="form-label fw-semibold mb-2">Categories</div>
                <div className="d-grid gap-1" style={{ maxHeight: "220px", overflowY: "auto" }}>
                  {categories.map((cat) => (
                    <label key={cat.id} className="form-check mb-0">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={(e) =>
                          setSelectedCategoryIds((cur) =>
                            e.target.checked
                              ? [...cur, cat.id]
                              : cur.filter((id) => id !== cat.id),
                          )
                        }
                      />
                      <span className="form-check-label">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="col-lg-9">
        {filteredProducts.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              No products match the current filters.
            </div>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3">
            {filteredProducts.map((product) => {
              const stock = getDisplayStock(product);
              const priceLabel = formatPrice(
                product.variantPrices,
                product.productType,
                product.price,
              );

              return (
                <div key={product.id} className="col">
                  <Link
                    href={`/product/${product.id}`}
                    className="text-decoration-none"
                  >
                    <article className="card border-0 shadow-sm h-100 storefront-product-card">
                      <div className="product-card-image-wrapper border-bottom bg-light-subtle">
                        {product.imagePath ? (
                          <img
                            src={product.imagePath}
                            alt={product.name}
                            className="product-card-image"
                          />
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
                        <div
                          className="small text-secondary text-truncate"
                          title={product.brand}
                        >
                          {product.brand}
                        </div>
                        <div className="fw-semibold text-dark">{priceLabel}</div>
                        {stock > 0 ? (
                          <span className="badge bg-success-subtle text-success-emphasis" style={{ width: "fit-content" }}>
                            In stock
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary-emphasis" style={{ width: "fit-content" }}>
                            Out of stock
                          </span>
                        )}
                      </div>
                    </article>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
