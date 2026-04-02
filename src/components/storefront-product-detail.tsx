"use client";

import Link from "next/link";
import { useState } from "react";
import type { StorefrontProductDetail } from "@/lib/storefront";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

type Props = {
  product: StorefrontProductDetail;
};

export function StorefrontProductDetail({ product }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const isVariable = product.productType === "VARIABLE";
  const selectedVariant = isVariable
    ? product.variants.find((v) => v.id === selectedVariantId) ?? null
    : null;

  const displayPrice = isVariable
    ? selectedVariant
      ? fmt(selectedVariant.price)
      : product.variants.length > 0
        ? (() => {
            const prices = product.variants.map((v) => v.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
          })()
        : fmt(product.price ?? 0)
    : fmt(product.price ?? 0);

  const displayStock = isVariable
    ? selectedVariant
      ? selectedVariant.stock
      : product.variants.reduce((sum, v) => sum + v.stock, 0)
    : (product.stock ?? 0);

  const addToBasketDisabled =
    (isVariable && !selectedVariantId) ||
    (isVariable && selectedVariant !== null && selectedVariant.stock === 0) ||
    (!isVariable && displayStock === 0);

  return (
    <div className="row g-4">
      {/* Gallery */}
      <div className="col-md-6">
        <div className="card border-0 shadow-sm overflow-hidden mb-3">
          <div className="storefront-gallery-main bg-light-subtle">
            {product.images.length > 0 ? (
              <img
                src={product.images[activeImage]?.filePath}
                alt={product.name}
                className="storefront-gallery-main-img"
              />
            ) : (
              <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary">
                No image
              </div>
            )}
          </div>
        </div>

        {product.images.length > 1 && (
          <div className="d-flex gap-2 flex-wrap">
            {product.images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`storefront-gallery-thumb border-0 p-0 bg-transparent ${i === activeImage ? "storefront-gallery-thumb--active" : ""}`}
              >
                <img src={img.filePath} alt={`${product.name} image ${i + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="col-md-6 d-grid gap-3 align-content-start">
        <div>
          <p className="text-secondary mb-1">{product.brand}</p>
          <h1 className="h3 mb-0">{product.name}</h1>
        </div>

        <div className="h4 mb-0 fw-bold">{displayPrice}</div>

        <div>
          {displayStock > 0 ? (
            <span className="badge bg-success-subtle text-success-emphasis fs-6 fw-normal">
              In stock ({displayStock})
            </span>
          ) : (
            <span className="badge bg-secondary-subtle text-secondary-emphasis fs-6 fw-normal">
              Out of stock
            </span>
          )}
        </div>

        {product.categories.length > 0 && (
          <div className="small text-secondary">
            {product.categories.map((c) => c.name).join(", ")}
          </div>
        )}

        {isVariable && product.variants.length > 0 && (
          <div>
            <label className="form-label fw-semibold" htmlFor="variant-select">
              Select option
            </label>
            <select
              id="variant-select"
              className="form-select"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
            >
              <option value="">Choose…</option>
              {product.variants.map((v) => (
                <option key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.name} — {fmt(v.price)}{v.stock === 0 ? " (out of stock)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className="btn btn-dark btn-lg"
          disabled={addToBasketDisabled}
        >
          {isVariable && product.variants.length === 0
            ? "Unavailable"
            : isVariable && !selectedVariantId
              ? "Select an option"
              : displayStock === 0
                ? "Out of stock"
                : "Add to basket"}
        </button>

        {product.description && (
          <div>
            <h2 className="h6 fw-semibold mb-1">Description</h2>
            <p className="text-secondary mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Linked products */}
        {product.linkedProducts.length > 0 && (
          <div>
            <h2 className="h6 fw-semibold mb-2">Related products</h2>
            <div className="d-flex gap-2 flex-wrap">
              {product.linkedProducts.map((linked) => (
                <Link
                  key={linked.id}
                  href={`/product/${linked.id}`}
                  className="linked-product-circle"
                  title={linked.name}
                >
                  {linked.imagePath ? (
                    <img src={linked.imagePath} alt={linked.name} />
                  ) : (
                    <span className="text-secondary" style={{ fontSize: "10px" }}>?</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
