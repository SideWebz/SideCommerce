"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StorefrontProductItem, StorefrontCategory } from "@/lib/storefront";

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

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

function getDisplayPrice(product: StorefrontProductItem) {
  if (product.productType === "VARIABLE") {
    if (product.variantPrices.length > 0) {
      return Math.min(...product.variantPrices);
    }
    return product.price ?? 0;
  }

  return product.price ?? (product.variantPrices.length > 0 ? Math.min(...product.variantPrices) : 0);
}

type Props = {
  products: StorefrontProductItem[];
  categories: StorefrontCategory[];
  heading?: string;
  subheading?: string;
  initialCategoryIds?: string[];
};

export function StorefrontProductGrid({
  products,
  categories,
  heading,
  subheading,
  initialCategoryIds = [],
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!isFilterOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFilterOpen]);

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const numericMinPrice = minPrice.trim() === "" ? null : Number(minPrice);
  const numericMaxPrice = maxPrice.trim() === "" ? null : Number(maxPrice);

  const hasInvalidPriceRange =
    numericMinPrice !== null && numericMaxPrice !== null && !Number.isNaN(numericMinPrice) && !Number.isNaN(numericMaxPrice)
      ? numericMinPrice > numericMaxPrice
      : false;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const min = Number.isNaN(numericMinPrice ?? Number.NaN) ? null : numericMinPrice;
    const max = Number.isNaN(numericMaxPrice ?? Number.NaN) ? null : numericMaxPrice;

    const filtered = products.filter((product) => {
      if (
        normalizedQuery &&
        !product.name.toLowerCase().includes(normalizedQuery) &&
        !product.brand.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (
        selectedCategoryIds.length > 0 &&
        !selectedCategoryIds.some((id) => product.categoryIds.includes(id))
      ) {
        return false;
      }

      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }

      const price = getDisplayPrice(product);

      if (min !== null && price < min) {
        return false;
      }

      if (max !== null && price > max) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "price-asc") {
        const priceA = getDisplayPrice(a);
        const priceB = getDisplayPrice(b);
        return priceA - priceB;
      }

      if (sortBy === "price-desc") {
        const priceA = getDisplayPrice(a);
        const priceB = getDisplayPrice(b);
        return priceB - priceA;
      }

      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [numericMaxPrice, numericMinPrice, products, searchQuery, selectedBrands, selectedCategoryIds, sortBy]);

  const activeFilterCount =
    selectedCategoryIds.length +
    selectedBrands.length +
    (searchQuery.trim() ? 1 : 0) +
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0);

  const activeFilterChips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...selectedCategoryIds.map((categoryId) => ({
      id: `category-${categoryId}`,
      label: `Category: ${categoryMap.get(categoryId) ?? categoryId}`,
      onRemove: () => setSelectedCategoryIds((current) => current.filter((id) => id !== categoryId)),
    })),
    ...selectedBrands.map((brand) => ({
      id: `brand-${brand}`,
      label: `Brand: ${brand}`,
      onRemove: () => setSelectedBrands((current) => current.filter((entry) => entry !== brand)),
    })),
  ];

  if (searchQuery.trim()) {
    activeFilterChips.push({
      id: "search",
      label: `Search: ${searchQuery.trim()}`,
      onRemove: () => setSearchQuery(""),
    });
  }

  if (minPrice.trim()) {
    activeFilterChips.push({
      id: "min-price",
      label: `Min EUR ${minPrice}`,
      onRemove: () => setMinPrice(""),
    });
  }

  if (maxPrice.trim()) {
    activeFilterChips.push({
      id: "max-price",
      label: `Max EUR ${maxPrice}`,
      onRemove: () => setMaxPrice(""),
    });
  }

  function clearAllFilters() {
    setSearchQuery("");
    setSelectedCategoryIds([]);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  }

  return (
    <section className="d-grid gap-4">
      {(heading || subheading) && (
        <header>
          {heading && <h2 className="h4 mb-1">{heading}</h2>}
          {subheading && <p className="text-secondary mb-0">{subheading}</p>}
        </header>
      )}

      <div className="card border-0 shadow-sm storefront-products-shell">
        <div className="card-body p-3 p-md-4 d-grid gap-3">
          <div className="storefront-toolbar">
            <div className="position-relative flex-grow-1">
              <label className="visually-hidden" htmlFor="sf-search">
                Search by product name or brand
              </label>
              <input
                id="sf-search"
                className="form-control form-control-lg pe-5"
                placeholder="Search products or brands"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="storefront-toolbar-search-icon text-secondary" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.398 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.114-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                </svg>
              </span>
            </div>

            <button
              type="button"
              className="btn btn-dark btn-lg storefront-filter-toggle"
              onClick={() => setIsFilterOpen(true)}
            >
              Filter
              {activeFilterCount > 0 && <span className="badge text-bg-light ms-2">{activeFilterCount}</span>}
            </button>
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-secondary small">Sort</span>
            <select
              id="sf-sort"
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "210px" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="d-flex gap-2 align-items-center storefront-active-filter-row">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                  onClick={chip.onRemove}
                >
                  {chip.label} ×
                </button>
              ))}
              <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={clearAllFilters}>
                Clear all filters
              </button>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center">
            <p className="text-secondary mb-0">{filteredProducts.length} products found</p>
            {hasInvalidPriceRange && (
              <span className="badge text-bg-danger-subtle text-danger-emphasis">Min price cannot exceed max price</span>
            )}
          </div>
        </div>
      </div>

      <div className={`storefront-filter-backdrop ${isFilterOpen ? "is-open" : ""}`} onClick={() => setIsFilterOpen(false)} />

      <aside className={`storefront-filter-panel ${isFilterOpen ? "is-open" : ""}`} aria-label="Filters">
        <div className="storefront-filter-handle" aria-hidden="true" />
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="h5 mb-0">Filters</h3>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setIsFilterOpen(false)}>
            Close
          </button>
        </div>

        <p className="small text-secondary mb-3">Filters update results instantly.</p>

        <div className="d-grid gap-3">
          <div>
            <div className="form-label fw-semibold mb-2">Brand</div>
            <div className="d-grid gap-1" style={{ maxHeight: "170px", overflowY: "auto" }}>
              {brands.map((brand) => (
                <label key={brand} className="form-check mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedBrands.includes(brand)}
                    onChange={(e) =>
                      setSelectedBrands((current) =>
                        e.target.checked ? [...current, brand] : current.filter((entry) => entry !== brand),
                      )
                    }
                  />
                  <span className="form-check-label">{brand}</span>
                </label>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <div className="form-label fw-semibold mb-2">Category</div>
              <div className="d-grid gap-1" style={{ maxHeight: "170px", overflowY: "auto" }}>
                {categories.map((cat) => (
                  <label key={cat.id} className="form-check mb-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={(e) =>
                        setSelectedCategoryIds((current) =>
                          e.target.checked ? [...current, cat.id] : current.filter((id) => id !== cat.id),
                        )
                      }
                    />
                    <span className="form-check-label">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="form-label fw-semibold mb-2">Price range</div>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small text-secondary mb-1" htmlFor="sf-min-price">
                  Min
                </label>
                <input
                  id="sf-min-price"
                  type="number"
                  min="0"
                  className="form-control"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-6">
                <label className="form-label small text-secondary mb-1" htmlFor="sf-max-price">
                  Max
                </label>
                <input
                  id="sf-max-price"
                  type="number"
                  min="0"
                  className="form-control"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="200"
                />
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 pt-2">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={clearAllFilters}>
              Clear all
            </button>
            <button type="button" className="btn btn-dark w-100" onClick={() => setIsFilterOpen(false)}>
              View results
            </button>
          </div>
        </div>
      </aside>

      {filteredProducts.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-5 text-center">
            <h3 className="h5 mb-2">No matching products</h3>
            <p className="text-secondary mb-3">Try changing search, brand, category, or price filters.</p>
            <button type="button" className="btn btn-outline-dark" onClick={clearAllFilters}>
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 row-cols-xxl-4 g-3">
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
    </section>
  );
}
