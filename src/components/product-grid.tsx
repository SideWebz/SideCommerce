"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FlashMessage } from "@/components/flash-message";

type LinkedProductThumb = {
  id: string;
  name: string;
  imagePath: string | null;
};

type Flash = {
  kind: "success" | "error";
  message: string;
};

type ProductCardItem = {
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
  linkedProducts: LinkedProductThumb[];
};

type CategoryOption = {
  id: string;
  name: string;
  productCount: number;
};

type ProductGridProps = {
  initialProducts: ProductCardItem[];
  categories: CategoryOption[];
};

type SortDirection = "none" | "asc" | "desc";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);
}

export function ProductGrid({ initialProducts, categories }: ProductGridProps) {
  const [products, setProducts] = useState<ProductCardItem[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [priceSort, setPriceSort] = useState<SortDirection>("none");
  const [stockSort, setStockSort] = useState<SortDirection>("none");
  const [menuProductId, setMenuProductId] = useState<string | null>(null);
  const [pickerProductId, setPickerProductId] = useState<string | null>(null);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (normalizedQuery && !product.name.toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      if (uncategorizedOnly && product.categoryIds.length > 0) {
        return false;
      }

      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.every((id) => product.categoryIds.includes(id))) {
        return false;
      }

      return true;
    });

    const getDisplayPrice = (product: ProductCardItem) => {
      if (product.productType === "VARIABLE") {
        if (product.variantPrices.length > 0) {
          return Math.min(...product.variantPrices);
        }
        return product.price ?? 0;
      }

      return product.price ?? (product.variantPrices.length > 0 ? Math.min(...product.variantPrices) : 0);
    };

    const getDisplayStock = (product: ProductCardItem) => {
      if (product.productType === "VARIABLE") {
        if (product.variantStockTotal > 0) {
          return product.variantStockTotal;
        }
        return product.stock ?? 0;
      }

      return product.stock ?? product.variantStockTotal;
    };

    filtered.sort((a, b) => {
      if (stockSort !== "none") {
        const stockA = getDisplayStock(a);
        const stockB = getDisplayStock(b);
        if (stockA !== stockB) {
          return stockSort === "asc" ? stockA - stockB : stockB - stockA;
        }
      }

      if (priceSort !== "none") {
        const priceA = getDisplayPrice(a);
        const priceB = getDisplayPrice(b);
        if (priceA !== priceB) {
          return priceSort === "asc" ? priceA - priceB : priceB - priceA;
        }
      }

      return b.name.localeCompare(a.name) * -1;
    });

    return filtered;
  }, [priceSort, products, searchQuery, selectedCategoryIds, stockSort, uncategorizedOnly]);

  function getPriceLabel(product: ProductCardItem) {
    if (product.productType === "VARIABLE") {
      if (product.variantPrices.length === 0) {
        return formatPrice(product.price ?? 0);
      }

      const min = Math.min(...product.variantPrices);
      const max = Math.max(...product.variantPrices);
      return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
    }

    if (product.price !== null) {
      return formatPrice(product.price);
    }

    if (product.variantPrices.length > 0) {
      return formatPrice(Math.min(...product.variantPrices));
    }

    return formatPrice(0);
  }

  function getStockLabel(product: ProductCardItem) {
    if (product.productType === "VARIABLE") {
      return String(product.variantStockTotal > 0 ? product.variantStockTotal : product.stock ?? 0);
    }

    return String(product.stock ?? product.variantStockTotal ?? 0);
  }

  function openCategoryPicker(productId: string) {
    const product = products.find((item) => item.id === productId);
    setPickerProductId(productId);
    setDraftCategoryIds(product?.categoryIds ?? []);
  }

  async function saveCategoryAssignment() {
    if (!pickerProductId) {
      return;
    }

    setIsSavingCategories(true);
    setFlash(null);

    try {
      const formData = new FormData();
      formData.set("productId", pickerProductId);
      formData.set("categoryIds", JSON.stringify(draftCategoryIds));

      const response = await fetch("/api/products/categories/update", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Failed to update categories." });
        return;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === pickerProductId
            ? {
                ...item,
                categoryIds: draftCategoryIds,
              }
            : item,
        ),
      );
      setFlash({ kind: "success", message: data.message ?? "Product categories updated." });
      setPickerProductId(null);
      setMenuProductId(null);
    } catch {
      setFlash({ kind: "error", message: "Network error while updating categories." });
    } finally {
      setIsSavingCategories(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    setFlash(null);

    try {
      const formData = new FormData();
      formData.set("id", productId);

      const response = await fetch("/api/products/delete", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Failed to delete product." });
        return;
      }

      setProducts((current) => current.filter((item) => item.id !== productId));
      setFlash({ kind: "success", message: data.message ?? "Product deleted." });
    } catch {
      setFlash({ kind: "error", message: "Network error while deleting product." });
    }
  }

  return (
    <div className="row g-4">
      <div className="col-lg-3">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3 d-grid gap-3">
            <div>
              <h2 className="h6 mb-2">Filters</h2>
              <p className="text-secondary small mb-0">Results update automatically while you type or change options.</p>
            </div>

            <div>
              <label className="form-label" htmlFor="product-search">Search by name</label>
              <input
                id="product-search"
                className="form-control"
                placeholder="Search products"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="price-sort">Sort by price</label>
              <select
                id="price-sort"
                className="form-select"
                value={priceSort}
                onChange={(event) => setPriceSort(event.target.value as SortDirection)}
              >
                <option value="none">No sorting</option>
                <option value="asc">Low to high</option>
                <option value="desc">High to low</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="stock-sort">Sort by stock</label>
              <select
                id="stock-sort"
                className="form-select"
                value={stockSort}
                onChange={(event) => setStockSort(event.target.value as SortDirection)}
              >
                <option value="none">No sorting</option>
                <option value="asc">Low to high</option>
                <option value="desc">High to low</option>
              </select>
            </div>

            <div>
              <div className="form-label mb-2">Category filter</div>
              <div className="d-grid gap-2" style={{ maxHeight: "220px", overflowY: "auto" }}>
                {categories.length === 0 ? (
                  <div className="small text-secondary">No categories available.</div>
                ) : (
                  categories.map((category) => (
                    <label key={category.id} className="form-check mb-0">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedCategoryIds.includes(category.id)}
                        onChange={(event) => {
                          setSelectedCategoryIds((current) => {
                            if (event.target.checked) {
                              return [...current, category.id];
                            }
                            return current.filter((id) => id !== category.id);
                          });
                        }}
                      />
                      <span className="form-check-label">
                        {category.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={uncategorizedOnly}
                onChange={(event) => setUncategorizedOnly(event.target.checked)}
              />
              <span className="form-check-label">Only uncategorized products</span>
            </label>
          </div>
        </div>
      </div>

      <div className="col-lg-9 d-grid gap-3">
        <FlashMessage flash={flash} />

        {filteredProducts.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              No products match the current filters.
            </div>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="col">
                <article
                  className="card border-0 shadow-sm h-100 product-card"
                  onMouseLeave={() => {
                    if (pickerProductId !== product.id) {
                      setMenuProductId((current) => (current === product.id ? null : current));
                    }
                  }}
                >
                  <div className="position-relative">
                    <div className="product-card-image-wrapper border-bottom bg-light-subtle">
                      {product.imagePath ? (
                        <img src={product.imagePath} alt={product.name} className="product-card-image" />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary">No image</div>
                      )}
                    </div>

                    <div className="position-absolute top-0 end-0 p-2" onMouseEnter={() => setMenuProductId(product.id)}>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={() => setMenuProductId((current) => (current === product.id ? null : product.id))}
                        aria-label="Open product menu"
                      >
                        ⋮
                      </button>

                      {menuProductId === product.id ? (
                        <div className="card border mt-1 position-absolute end-0" style={{ width: "250px", zIndex: 20 }}>
                          <div className="list-group list-group-flush">
                            <button
                              type="button"
                              className="list-group-item list-group-item-action"
                              onClick={() => openCategoryPicker(product.id)}
                            >
                              Add to Category
                            </button>
                            <Link href={`/products/${product.id}/edit`} className="list-group-item list-group-item-action">
                              Edit product
                            </Link>
                            <button
                              type="button"
                              className="list-group-item list-group-item-action text-danger"
                              onClick={() => deleteProduct(product.id)}
                            >
                              Delete product
                            </button>
                          </div>

                          {pickerProductId === product.id ? (
                            <div className="border-top p-2 d-grid gap-2">
                              <div className="small fw-semibold">Select categories</div>
                              <div className="d-grid gap-1" style={{ maxHeight: "160px", overflowY: "auto" }}>
                                {categories.length === 0 ? (
                                  <div className="small text-secondary">Create categories first.</div>
                                ) : (
                                  categories.map((category) => (
                                    <label key={category.id} className="form-check mb-0">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={draftCategoryIds.includes(category.id)}
                                        onChange={(event) => {
                                          setDraftCategoryIds((current) => {
                                            if (event.target.checked) {
                                              return [...current, category.id];
                                            }
                                            return current.filter((id) => id !== category.id);
                                          });
                                        }}
                                      />
                                      <span className="form-check-label small">{category.name}</span>
                                    </label>
                                  ))
                                )}
                              </div>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-dark"
                                  onClick={saveCategoryAssignment}
                                  disabled={isSavingCategories}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setPickerProductId(null)}
                                  disabled={isSavingCategories}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="card-body d-flex gap-2 align-items-start">
                    <div className="flex-grow-1 d-grid gap-1" style={{ minWidth: 0 }}>
                      <h3 className="h6 mb-0 text-truncate" title={product.name}>{product.name}</h3>
                      <div className="small text-secondary text-truncate" title={product.brand}>{product.brand}</div>
                      <div className="fw-semibold">{getPriceLabel(product)}</div>
                      <div className="small text-secondary">Stock: {getStockLabel(product)}</div>
                      <div className="small text-secondary text-truncate" title={product.categoryIds.map((id) => categoryMap.get(id)).filter(Boolean).join(", ")}>
                        {product.categoryIds.length === 0
                          ? "Uncategorized"
                          : product.categoryIds
                              .map((id) => categoryMap.get(id))
                              .filter((name): name is string => Boolean(name))
                              .join(", ")}
                      </div>
                    </div>

                    {product.linkedProducts.length > 0 && (
                      <div className="linked-circles">
                        {product.linkedProducts.slice(0, 2).map((linked) => (
                          <div key={linked.id} className="linked-product-circle" title={linked.name}>
                            {linked.imagePath ? (
                              <img src={linked.imagePath} alt={linked.name} />
                            ) : (
                              <span className="text-secondary" style={{ fontSize: "10px" }}>?</span>
                            )}
                          </div>
                        ))}
                        {product.linkedProducts.length > 2 && (
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="linked-product-circle linked-product-circle--more"
                            title={`${product.linkedProducts.length - 2} more linked product${product.linkedProducts.length - 2 > 1 ? "s" : ""} — view all`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11"/>
                            </svg>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
