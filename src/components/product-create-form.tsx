"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlashMessage } from "@/components/flash-message";
import { LinkedProductsSelector, type LinkedProductOption } from "@/components/linked-products-selector";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-constants";

type Flash = {
  kind: "success" | "error";
  message: string;
};

type VariantDraft = {
  id: string;
  name: string;
  price: string;
  stock: string;
};

function makeVariantDraft(): VariantDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    stock: "",
  };
}

export function ProductCreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">("SIMPLE");
  const [simplePrice, setSimplePrice] = useState("");
  const [simpleStock, setSimpleStock] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([makeVariantDraft()]);
  const [allProducts, setAllProducts] = useState<LinkedProductOption[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProductOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fileNames = useMemo(() => selectedFiles.map((file) => file.name), [selectedFiles]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length > MAX_PRODUCT_IMAGES) {
      setFlash({ kind: "error", message: `You can upload a maximum of ${MAX_PRODUCT_IMAGES} images.` });
      event.currentTarget.value = "";
      setSelectedFiles([]);
      return;
    }

    setFlash(null);
    setSelectedFiles(files);
  }

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      const response = await fetch("/api/products/list", { credentials: "include" });
      const data = (await response.json().catch(() => ({}))) as { products?: LinkedProductOption[] };
      if (!active || !response.ok || !Array.isArray(data.products)) {
        return;
      }
      setAllProducts(data.products);
    }

    loadProducts().catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return allProducts.filter((product) => !linkedProducts.some((linked) => linked.id === product.id));
    }

    return allProducts.filter((product) => {
      const alreadyLinked = linkedProducts.some((linked) => linked.id === product.id);
      if (alreadyLinked) return false;
      const text = `${product.name} ${product.brand} ${product.description}`.toLowerCase();
      return text.includes(query);
    });
  }, [allProducts, linkedProducts, searchQuery]);

  function attachLinkedProduct(product: LinkedProductOption) {
    setLinkedProducts((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current;
      }
      return [...current, product];
    });
  }

  function removeLinkedProduct(id: string) {
    setLinkedProducts((current) => current.filter((item) => item.id !== id));
  }

  function addVariant() {
    setVariants((current) => [...current, makeVariantDraft()]);
  }

  function removeVariant(id: string) {
    setVariants((current) => {
      if (current.length === 1) {
        return current;
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function updateVariant(id: string, key: "name" | "price" | "stock", value: string) {
    setVariants((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (selectedFiles.length > MAX_PRODUCT_IMAGES) {
      setFlash({ kind: "error", message: `You can upload a maximum of ${MAX_PRODUCT_IMAGES} images.` });
      return;
    }

    setIsSubmitting(true);
    setFlash(null);

    try {
      const formData = new FormData(form);
      const name = String(formData.get("name") ?? "").trim();
      const brand = String(formData.get("brand") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();

      if (!name || !brand || !description) {
        setFlash({ kind: "error", message: "Name, brand, and description are required." });
        return;
      }

      const baseInfo = new FormData();
      baseInfo.set("name", name);
      baseInfo.set("brand", brand);
      baseInfo.set("description", description);
      baseInfo.set("productType", productType);

      if (productType === "SIMPLE") {
        const priceValue = simplePrice.trim();
        const stockValue = simpleStock.trim();
        const price = Number(priceValue);
        const stock = Number(stockValue);

        if (!priceValue || !stockValue) {
          setFlash({ kind: "error", message: "Price and stock are required for simple products." });
          return;
        }

        if (!Number.isFinite(price) || price < 0) {
          setFlash({ kind: "error", message: "Price must be a valid number greater than or equal to 0." });
          return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
          setFlash({ kind: "error", message: "Stock must be an integer greater than or equal to 0." });
          return;
        }

        baseInfo.set("price", priceValue);
        baseInfo.set("stock", stockValue);
      }

      if (productType === "VARIABLE") {
        if (variants.length === 0) {
          setFlash({ kind: "error", message: "At least one variant is required for variable products." });
          return;
        }

        const variantPayload: Array<{ name: string; price: number; stock: number }> = [];

        for (const variant of variants) {
          const variantName = variant.name.trim();
          const variantPrice = Number(variant.price);
          const variantStock = Number(variant.stock);

          if (!variantName || variant.price.trim() === "" || variant.stock.trim() === "") {
            setFlash({ kind: "error", message: "Each variant needs name, price, and stock." });
            return;
          }

          if (!Number.isFinite(variantPrice) || variantPrice < 0) {
            setFlash({ kind: "error", message: "Variant price must be greater than or equal to 0." });
            return;
          }

          if (!Number.isInteger(variantStock) || variantStock < 0) {
            setFlash({ kind: "error", message: "Variant stock must be an integer greater than or equal to 0." });
            return;
          }

          variantPayload.push({
            name: variantName,
            price: variantPrice,
            stock: variantStock,
          });
        }

        baseInfo.set("variants", JSON.stringify(variantPayload));
      }

      const createResponse = await fetch("/api/products/create", {
        method: "POST",
        body: baseInfo,
        credentials: "include",
      });

      const createData = (await createResponse.json().catch(() => ({}))) as { message?: string; productId?: string };

      if (!createResponse.ok || !createData.productId) {
        setFlash({ kind: "error", message: createData.message ?? "Failed to create product." });
        return;
      }

      let uploadedCount = 0;
      for (const file of selectedFiles) {
        const uploadFormData = new FormData();
        uploadFormData.set("productId", createData.productId);
        uploadFormData.set("image", file);

        const uploadResponse = await fetch("/api/products/images/upload", {
          method: "POST",
          body: uploadFormData,
          credentials: "include",
        });

        const uploadData = (await uploadResponse.json().catch(() => ({}))) as { message?: string };

        if (!uploadResponse.ok) {
          setFlash({
            kind: "error",
            message: uploadData.message
              ? `Product created, but image upload failed: ${uploadData.message}`
              : "Product created, but image upload failed.",
          });
          router.refresh();
          return;
        }

        uploadedCount += 1;
      }

      for (const linked of linkedProducts) {
        const linkFormData = new FormData();
        linkFormData.set("productId", createData.productId);
        linkFormData.set("linkedProductId", linked.id);
        linkFormData.set("relationType", "RELATED");

        const linkResponse = await fetch("/api/products/link/add", {
          method: "POST",
          body: linkFormData,
          credentials: "include",
        });

        if (!linkResponse.ok) {
          const linkData = (await linkResponse.json().catch(() => ({}))) as { message?: string };
          setFlash({
            kind: "error",
            message: linkData.message
              ? `Product created, but linking failed: ${linkData.message}`
              : "Product created, but linking failed.",
          });
          router.refresh();
          return;
        }
      }

      const successMessage = uploadedCount > 0
        ? `Product created with ${uploadedCount} image${uploadedCount === 1 ? "" : "s"}.`
        : "Product created.";

      setFlash({ kind: "success", message: successMessage });
      form.reset();
      setSelectedFiles([]);
      setProductType("SIMPLE");
      setSimplePrice("");
      setSimpleStock("");
      setVariants([makeVariantDraft()]);
      setLinkedProducts([]);
      setSearchQuery("");
      router.push("/products");
      router.refresh();
    } catch {
      setFlash({ kind: "error", message: "Network error while creating product. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Create Product</h2>
          <Link href="/products" className="btn btn-outline-secondary btn-sm">
            Back to list
          </Link>
        </div>

        <p className="text-secondary mb-4">Add base product info and upload up to {MAX_PRODUCT_IMAGES} images.</p>

        <FlashMessage flash={flash} />

        <form onSubmit={handleSubmit} className="d-grid gap-3">
          <div>
            <label className="form-label d-block mb-2">Product type</label>
            <div className="d-flex flex-wrap gap-3">
              <div className="form-check">
                <input
                  id="type-simple"
                  name="productType"
                  type="radio"
                  value="SIMPLE"
                  className="form-check-input"
                  checked={productType === "SIMPLE"}
                  onChange={() => setProductType("SIMPLE")}
                />
                <label htmlFor="type-simple" className="form-check-label">Simple</label>
              </div>
              <div className="form-check">
                <input
                  id="type-variable"
                  name="productType"
                  type="radio"
                  value="VARIABLE"
                  className="form-check-input"
                  checked={productType === "VARIABLE"}
                  onChange={() => setProductType("VARIABLE")}
                />
                <label htmlFor="type-variable" className="form-check-label">Variable</label>
              </div>
            </div>
            <div className="form-text">
              {productType === "SIMPLE"
                ? "Simple products use one standard price/stock setup."
                : "Variable products use variant-level price/stock and ignore product-level values."}
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="name">Name</label>
            <input id="name" name="name" className="form-control" required />
          </div>

          <div>
            <label className="form-label" htmlFor="brand">Brand</label>
            <input id="brand" name="brand" className="form-control" required />
          </div>

          <div>
            <label className="form-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="form-control" rows={4} required />
          </div>

          <div>
            <label className="form-label" htmlFor="images">Images (max {MAX_PRODUCT_IMAGES})</label>
            <input
              id="images"
              name="images"
              type="file"
              className="form-control"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={onFileChange}
            />
            <div className="form-text">Selected: {selectedFiles.length}/{MAX_PRODUCT_IMAGES}</div>
            {fileNames.length > 0 ? (
              <ul className="mt-2 mb-0 ps-3 text-secondary small">
                {fileNames.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <LinkedProductsSelector
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            availableProducts={filteredProducts}
            selectedProducts={linkedProducts}
            onSelect={attachLinkedProduct}
            onRemove={(product) => removeLinkedProduct(product.id)}
          />

          {productType === "SIMPLE" ? (
            <div className="border rounded p-3 bg-light-subtle">
              <div className="fw-semibold mb-3">Simple product fields</div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="price">Price</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={simplePrice}
                    onChange={(event) => setSimplePrice(event.target.value)}
                    required={productType === "SIMPLE"}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="stock">Stock</label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    placeholder="0"
                    value={simpleStock}
                    onChange={(event) => setSimpleStock(event.target.value)}
                    required={productType === "SIMPLE"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded p-3 bg-light-subtle">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div className="fw-semibold">Variant builder</div>
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={addVariant}>
                  Add variant
                </button>
              </div>

              <div className="d-grid gap-3">
                {variants.map((variant, index) => (
                  <div key={variant.id} className="border rounded p-3 bg-white">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <div className="small text-secondary">Variant {index + 1}</div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeVariant(variant.id)}
                        disabled={variants.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label" htmlFor={`variant-name-${variant.id}`}>Name</label>
                        <input
                          id={`variant-name-${variant.id}`}
                          type="text"
                          className="form-control"
                          value={variant.name}
                          onChange={(event) => updateVariant(variant.id, "name", event.target.value)}
                          placeholder="e.g. Large / Blue"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor={`variant-price-${variant.id}`}>Price</label>
                        <input
                          id={`variant-price-${variant.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={variant.price}
                          onChange={(event) => updateVariant(variant.id, "price", event.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor={`variant-stock-${variant.id}`}>Stock</label>
                        <input
                          id={`variant-stock-${variant.id}`}
                          type="number"
                          min="0"
                          step="1"
                          className="form-control"
                          value={variant.stock}
                          onChange={(event) => updateVariant(variant.id, "stock", event.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-dark" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create product"}
            </button>
            <Link href="/products" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
