"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";

type AvailabilityEntry = {
  productId: string;
  variantId: string | null;
  availableStock: number;
  itemLabel: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

export function CartView() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const [availability, setAvailability] = useState<Record<string, AvailabilityEntry>>({});
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockCheckError, setStockCheckError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function fetchAvailability() {
      if (items.length === 0) {
        if (isActive) {
          setAvailability({});
          setStockCheckError(null);
          setIsCheckingStock(false);
        }
        return;
      }

      setIsCheckingStock(true);
      setStockCheckError(null);

      try {
        const res = await fetch("/api/cart/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
            })),
          }),
        });

        const data = (await res.json()) as {
          message?: string;
          availability?: AvailabilityEntry[];
        };

        if (!res.ok) {
          throw new Error(data.message ?? "Unable to validate stock right now.");
        }

        if (!isActive) {
          return;
        }

        const nextAvailability = Object.fromEntries(
          (data.availability ?? []).map((entry) => [
            `${entry.productId}-${entry.variantId ?? ""}`,
            entry,
          ]),
        );

        setAvailability(nextAvailability);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStockCheckError(error instanceof Error ? error.message : "Unable to validate stock right now.");
      } finally {
        if (isActive) {
          setIsCheckingStock(false);
        }
      }
    }

    fetchAvailability();

    return () => {
      isActive = false;
    };
  }, [items]);

  const stockIssues = useMemo(() => {
    return items.flatMap((item) => {
      const key = `${item.productId}-${item.variantId ?? ""}`;
      const entry = availability[key];
      if (!entry) {
        return [];
      }

      if (entry.availableStock <= 0) {
        return [`${entry.itemLabel} is not in stock anymore.`];
      }

      if (item.quantity > entry.availableStock) {
        return [`${entry.itemLabel} only has ${entry.availableStock} left in stock.`];
      }

      return [];
    });
  }, [availability, items]);

  const hasBlockingStockIssue = stockIssues.length > 0 || Boolean(stockCheckError);

  if (items.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-secondary mb-4">Your cart is empty.</p>
        <Link href="/" className="btn btn-dark">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <h1 className="h4 mb-4">Your cart</h1>
        {stockCheckError && (
          <div className="alert alert-warning py-2" role="alert">
            {stockCheckError}
          </div>
        )}
        {!stockCheckError && stockIssues.length > 0 && (
          <div className="alert alert-warning py-2" role="alert">
            {stockIssues[0]}
          </div>
        )}
        <div className="d-flex flex-column gap-3">
          {items.map((item) => {
            const key = `${item.productId}-${item.variantId ?? ""}`;
            const subtotal = item.unitPrice * item.quantity;
            const entry = availability[key];
            const incrementDisabled =
              isCheckingStock ||
              (entry ? item.quantity >= entry.availableStock : false);
            const itemWarning = entry
              ? entry.availableStock <= 0
                ? `${entry.itemLabel} is not in stock anymore.`
                : item.quantity > entry.availableStock
                  ? `Only ${entry.availableStock} left in stock.`
                  : null
              : null;
            return (
              <div key={key} className="card border-0 shadow-sm">
                <div className="card-body p-3">
                  <div className="d-flex gap-3 align-items-start">
                    {/* Image */}
                    <div
                      className="bg-light rounded overflow-hidden flex-shrink-0"
                      style={{ width: 72, height: 72 }}
                    >
                      {item.imagePath ? (
                        <img
                          src={item.imagePath}
                          alt={item.productName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary small">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow-1 min-w-0">
                      <p className="mb-0 fw-semibold">{item.productName}</p>
                      {item.variantName && (
                        <p className="mb-1 small text-secondary">{item.variantName}</p>
                      )}
                      <p className="mb-2 small text-secondary">{fmt(item.unitPrice)} each</p>

                      {/* Quantity control */}
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm px-2 py-0"
                          style={{ lineHeight: 1.6 }}
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-1">{item.quantity}</span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm px-2 py-0"
                          style={{ lineHeight: 1.6 }}
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                          disabled={incrementDisabled}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger text-decoration-none ms-2 p-0"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          Remove
                        </button>
                      </div>
                      {entry && (
                        <p className={`small mb-0 mt-2 ${itemWarning ? "text-danger" : "text-secondary"}`}>
                          {itemWarning ?? `Available now: ${entry.availableStock}`}
                        </p>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="text-end flex-shrink-0">
                      <span className="fw-semibold">{fmt(subtotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="col-lg-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h5 mb-3">Order summary</h2>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Subtotal</span>
              <span>{fmt(totalPrice)}</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-1 fw-bold">
              <span>Total</span>
              <span>{fmt(totalPrice)}</span>
            </div>
            <p className="small text-secondary mb-3">All prices include VAT</p>
            {hasBlockingStockIssue ? (
              <button type="button" className="btn btn-dark w-100" disabled>
                Resolve stock issue first
              </button>
            ) : (
              <Link href="/checkout" className="btn btn-dark w-100">
                {isCheckingStock ? "Checking stock…" : "Proceed to checkout"}
              </Link>
            )}
            <Link href="/" className="btn btn-outline-secondary w-100 mt-2">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
