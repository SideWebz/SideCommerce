"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlashMessage } from "@/components/flash-message";
import { LinkedProductsSelector, type LinkedProductOption } from "@/components/linked-products-selector";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-constants";

type Flash = { kind: "success" | "error"; message: string };

type VariantItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type ImageItem = {
  id: string;
  filePath: string;
  sortOrder: number | null;
};

type EditableProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  productType: "SIMPLE" | "VARIABLE";
  price: number | null;
  stock: number | null;
  variants: VariantItem[];
  images: ImageItem[];
  linkedProducts: LinkedProductOption[];
};

type ProductEditFormProps = {
  initialProduct: EditableProduct;
};

export function ProductEditForm({ initialProduct }: ProductEditFormProps) {
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [isSavingBase, setIsSavingBase] = useState(false);
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">(initialProduct.productType);
  const [name, setName] = useState(initialProduct.name);
  const [brand, setBrand] = useState(initialProduct.brand);
  const [description, setDescription] = useState(initialProduct.description);
  const [simplePrice, setSimplePrice] = useState(
    initialProduct.price === null ? "" : String(initialProduct.price),
  );
  const [simpleStock, setSimpleStock] = useState(
    initialProduct.stock === null ? "" : String(initialProduct.stock),
  );

  const [variants, setVariants] = useState<VariantItem[]>(
    initialProduct.productType === "VARIABLE" ? initialProduct.variants : [],
  );
  const [newVariant, setNewVariant] = useState({ name: "", price: "", stock: "" });

  const [images, setImages] = useState<ImageItem[]>(initialProduct.images);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [allProducts, setAllProducts] = useState<LinkedProductOption[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProductOption[]>(initialProduct.linkedProducts);
  const [searchQuery, setSearchQuery] = useState("");

  const isVariableProduct = productType === "VARIABLE";

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

  const searchableProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allProducts.filter((product) => {
      if (product.id === initialProduct.id) return false;
      if (linkedProducts.some((linked) => linked.id === product.id)) return false;
      const haystack = `${product.name} ${product.brand} ${product.description}`.toLowerCase();
      return query ? haystack.includes(query) : true;
    });
  }, [allProducts, initialProduct.id, linkedProducts, searchQuery]);

  async function saveBaseInfo() {
    setIsSavingBase(true);
    setFlash(null);

    try {
      if (!name.trim() || !brand.trim() || !description.trim()) {
        setFlash({ kind: "error", message: "Name, brand, and description are required." });
        return;
      }

      if (!isVariableProduct) {
        const price = Number(simplePrice);
        const stock = Number(simpleStock);

        if (simplePrice.trim() === "" || simpleStock.trim() === "") {
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
      }

      const formData = new FormData();
      formData.set("id", initialProduct.id);
      formData.set("name", name.trim());
      formData.set("brand", brand.trim());
      formData.set("description", description.trim());
      formData.set("productType", productType);

      if (!isVariableProduct) {
        formData.set("price", simplePrice.trim());
        formData.set("stock", simpleStock.trim());
      }

      const response = await fetch("/api/products/update", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Failed to update product" });
        return;
      }

      setFlash({ kind: "success", message: data.message ?? "Product updated" });
      router.refresh();
    } finally {
      setIsSavingBase(false);
    }
  }

  function onUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > MAX_PRODUCT_IMAGES) {
      setFlash({ kind: "error", message: `You can select at most ${MAX_PRODUCT_IMAGES} files at once` });
      event.currentTarget.value = "";
      setUploadFiles([]);
      return;
    }
    if (images.length + files.length > MAX_PRODUCT_IMAGES) {
      setFlash({ kind: "error", message: `A product can have at most ${MAX_PRODUCT_IMAGES} images` });
      event.currentTarget.value = "";
      setUploadFiles([]);
      return;
    }
    setUploadFiles(files);
  }

  async function uploadSelectedImages() {
    if (uploadFiles.length === 0) {
      setFlash({ kind: "error", message: "Select at least one image" });
      return;
    }

    if (images.length + uploadFiles.length > MAX_PRODUCT_IMAGES) {
      setFlash({ kind: "error", message: `A product can have at most ${MAX_PRODUCT_IMAGES} images` });
      return;
    }

    setIsUploadingImages(true);
    setFlash(null);

    try {
      const newImages: ImageItem[] = [];
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.set("productId", initialProduct.id);
        formData.set("image", file);

        const response = await fetch("/api/products/images/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
          image?: ImageItem;
        };

        if (!response.ok || !data.image) {
          setFlash({ kind: "error", message: data.message ?? "Image upload failed" });
          return;
        }

        newImages.push(data.image);
      }

      setImages((current) => [...current, ...newImages]);
      setUploadFiles([]);
      setFlash({ kind: "success", message: "Images uploaded" });
      router.refresh();
    } catch {
      setFlash({ kind: "error", message: "Network error while uploading images" });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function deleteImage(imageId: string) {
    try {
      const formData = new FormData();
      formData.set("imageId", imageId);
      formData.set("productId", initialProduct.id);

      const response = await fetch("/api/products/images/delete", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Failed to delete image" });
        return;
      }

      setImages((current) => current.filter((img) => img.id !== imageId));
      setFlash({ kind: "success", message: data.message ?? "Image deleted" });
      router.refresh();
    } catch {
      setFlash({ kind: "error", message: "Network error while deleting image" });
    }
  }

  async function updateVariant(variant: VariantItem) {
    if (!isVariableProduct) {
      return;
    }

    if (!variant.name.trim()) {
      setFlash({ kind: "error", message: "Variant name is required" });
      return;
    }

    if (!Number.isFinite(variant.price) || variant.price < 0) {
      setFlash({ kind: "error", message: "Variant price must be greater than or equal to 0" });
      return;
    }

    if (!Number.isInteger(variant.stock) || variant.stock < 0) {
      setFlash({ kind: "error", message: "Variant stock must be an integer greater than or equal to 0" });
      return;
    }

    const formData = new FormData();
    formData.set("id", variant.id);
    formData.set("name", variant.name.trim());
    formData.set("price", String(variant.price));
    formData.set("stock", String(variant.stock));

    const response = await fetch("/api/variants/update", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Failed to update variant" });
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Variant updated" });
  }

  async function addVariant() {
    if (!isVariableProduct) {
      return;
    }

    const variantName = newVariant.name.trim();
    const variantPrice = Number(newVariant.price);
    const variantStock = Number(newVariant.stock);

    if (!variantName || newVariant.price.trim() === "" || newVariant.stock.trim() === "") {
      setFlash({ kind: "error", message: "New variant needs name, price, and stock" });
      return;
    }

    if (!Number.isFinite(variantPrice) || variantPrice < 0) {
      setFlash({ kind: "error", message: "Variant price must be greater than or equal to 0" });
      return;
    }

    if (!Number.isInteger(variantStock) || variantStock < 0) {
      setFlash({ kind: "error", message: "Variant stock must be an integer greater than or equal to 0" });
      return;
    }

    const formData = new FormData();
    formData.set("productId", initialProduct.id);
    formData.set("name", variantName);
    formData.set("price", String(variantPrice));
    formData.set("stock", String(variantStock));

    const response = await fetch("/api/variants/add", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; variantId?: string };
    const variantId = data.variantId;

    if (!response.ok || !variantId) {
      setFlash({ kind: "error", message: data.message ?? "Failed to add variant" });
      return;
    }

    setVariants((current) => [
      ...current,
      {
        id: variantId,
        name: variantName,
        price: variantPrice,
        stock: variantStock,
      },
    ]);
    setNewVariant({ name: "", price: "", stock: "" });
    setFlash({ kind: "success", message: data.message ?? "Variant added" });
    router.refresh();
  }

  async function removeVariant(id: string) {
    if (!isVariableProduct) {
      return;
    }

    const formData = new FormData();
    formData.set("id", id);

    const response = await fetch("/api/variants/delete", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Failed to remove variant" });
      return;
    }

    setVariants((current) => current.filter((variant) => variant.id !== id));
    setFlash({ kind: "success", message: data.message ?? "Variant deleted" });
    router.refresh();
  }

  async function addLink(linkedProduct: LinkedProductOption) {
    const formData = new FormData();
    formData.set("productId", initialProduct.id);
    formData.set("linkedProductId", linkedProduct.id);
    formData.set("relationType", "RELATED");

    const response = await fetch("/api/products/link/add", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Failed to add link" });
      return;
    }

    setLinkedProducts((current) => [...current, linkedProduct]);
    setFlash({ kind: "success", message: data.message ?? "Linked products updated" });
    router.refresh();
  }

  async function removeLink(linkedProduct: LinkedProductOption) {
    const formData = new FormData();
    formData.set("productId", initialProduct.id);
    formData.set("linkedProductId", linkedProduct.id);
    formData.set("relationType", "RELATED");

    const response = await fetch("/api/products/link/remove", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Failed to remove link" });
      return;
    }

    setLinkedProducts((current) => current.filter((item) => item.id !== linkedProduct.id));
    setFlash({ kind: "success", message: data.message ?? "Linked products updated" });
    router.refresh();
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4 d-grid gap-4">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <h2 className="h5 mb-0">Edit Product</h2>
          <Link href="/products" className="btn btn-outline-secondary btn-sm">Back to list</Link>
        </div>

        <FlashMessage flash={flash} />

        <section className="settings-section">
          <h3 className="h6 mb-3">Base info</h3>
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label">Product type</label>
              <div className="d-flex flex-wrap gap-3">
                <div className="form-check">
                  <input
                    id="edit-type-simple"
                    name="productType"
                    type="radio"
                    value="SIMPLE"
                    className="form-check-input"
                    checked={productType === "SIMPLE"}
                    onChange={() => setProductType("SIMPLE")}
                  />
                  <label htmlFor="edit-type-simple" className="form-check-label">Simple</label>
                </div>
                <div className="form-check">
                  <input
                    id="edit-type-variable"
                    name="productType"
                    type="radio"
                    value="VARIABLE"
                    className="form-check-input"
                    checked={productType === "VARIABLE"}
                    onChange={() => setProductType("VARIABLE")}
                  />
                  <label htmlFor="edit-type-variable" className="form-check-label">Variable</label>
                </div>
              </div>
              <div className="form-text">
                {isVariableProduct
                  ? "Variable products need at least one variant before you save base info."
                  : "Switching to simple will remove all existing variants after save."}
              </div>
            </div>
            <div className="col-md-6">
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            </div>
            <div className="col-md-6">
              <input className="form-control" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" />
            </div>
            <div className="col-12">
              <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            </div>
            {!isVariableProduct ? (
              <>
                <div className="col-md-6">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={simplePrice}
                    onChange={(e) => setSimplePrice(e.target.value)}
                    placeholder="Price"
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="1"
                    value={simpleStock}
                    onChange={(e) => setSimpleStock(e.target.value)}
                    placeholder="Stock"
                  />
                </div>
              </>
            ) : null}
          </div>
          <button type="button" className="btn btn-dark mt-3" onClick={saveBaseInfo} disabled={isSavingBase}>
            {isSavingBase ? "Saving..." : "Save base info"}
          </button>
        </section>

        <section className="settings-section">
          <h3 className="h6 mb-3">Images</h3>
          <div className="row g-2 mb-3">
            {images.map((image) => (
              <div key={image.id} className="col-6 col-md-3">
                <div className="border rounded p-2 h-100 d-flex flex-column gap-2">
                  <img src={image.filePath} alt="Product" className="rounded" style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteImage(image.id)}>
                    Remove image
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="d-grid gap-2">
            <input
              type="file"
              className="form-control"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={onUploadChange}
            />
            <div className="form-text">Selected {uploadFiles.length} file(s). Max total images per product: {MAX_PRODUCT_IMAGES}.</div>
            <button type="button" className="btn btn-dark" onClick={uploadSelectedImages} disabled={isUploadingImages}>
              {isUploadingImages ? "Uploading..." : "Upload selected images"}
            </button>
          </div>
        </section>

        {isVariableProduct ? (
          <section className="settings-section">
            <h3 className="h6 mb-3">Variants</h3>
            <div className="d-grid gap-2 mb-3">
              {variants.map((variant) => (
                <div key={variant.id} className="border rounded p-3">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <input
                        className="form-control"
                        value={variant.name}
                        onChange={(e) =>
                          setVariants((current) =>
                            current.map((item) => (item.id === variant.id ? { ...item, name: e.target.value } : item)),
                          )
                        }
                        placeholder="Variant name"
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={variant.price}
                        onChange={(e) =>
                          setVariants((current) =>
                            current.map((item) => (item.id === variant.id ? { ...item, price: Number(e.target.value || 0) } : item)),
                          )
                        }
                        placeholder="Price"
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-control"
                        value={variant.stock}
                        onChange={(e) =>
                          setVariants((current) =>
                            current.map((item) => (item.id === variant.id ? { ...item, stock: Number(e.target.value || 0) } : item)),
                          )
                        }
                        placeholder="Stock"
                      />
                    </div>
                    <div className="col-12 col-md-2 d-grid gap-2">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => updateVariant(variant)}>
                        Save
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeVariant(variant.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border rounded p-3">
              <div className="row g-2">
                <div className="col-12 col-md-4">
                  <input
                    className="form-control"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="New variant name"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="Price"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="1"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="Stock"
                  />
                </div>
                <div className="col-12 col-md-2 d-grid">
                  <button type="button" className="btn btn-dark btn-sm" onClick={addVariant}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="settings-section">
          <LinkedProductsSelector
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            availableProducts={searchableProducts}
            selectedProducts={linkedProducts}
            onSelect={addLink}
            onRemove={removeLink}
            selectLabel="Link"
            removeLabel="Unlink"
            selectedTitle="Currently linked"
            emptySelectedText="No linked products yet."
          />
        </section>
      </div>
    </div>
  );
}
