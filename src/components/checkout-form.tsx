"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import type { StorefrontShippingRegion } from "@/lib/storefront";

type CheckoutFormProps = {
  shippingRegions: StorefrontShippingRegion[];
};

export function CheckoutForm({ shippingRegions }: CheckoutFormProps) {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const hasShippingRegions = shippingRegions.length > 0;

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerStreet: "",
    customerHouseNumber: "",
    customerPostalCode: "",
    customerCity: "",
    customerCountry: shippingRegions[0]?.country ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

  const selectedShippingRegion = shippingRegions.find(
    (region) => region.country === form.customerCountry,
  );

  const shippingCost = selectedShippingRegion
    ? selectedShippingRegion.freeShippingFrom !== null && totalPrice >= selectedShippingRegion.freeShippingFrom
      ? 0
      : selectedShippingRegion.shippingCost
    : 0;

  const totalWithShipping = totalPrice + shippingCost;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!selectedShippingRegion) {
      setError("Please select a valid shipping country.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          customerStreet: form.customerStreet,
          customerHouseNumber: form.customerHouseNumber,
          customerPostalCode: form.customerPostalCode,
          customerCity: form.customerCity,
          customerCountry: form.customerCountry,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            productName: item.productName,
            variantName: item.variantName ?? undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const data = (await res.json()) as {
        message: string;
        orderId?: string;
        mollieCheckoutUrl?: string;
      };

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      clearCart();

      if (data.mollieCheckoutUrl) {
        window.location.href = data.mollieCheckoutUrl;
      } else {
        router.push(`/order/${data.orderId}`);
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="row g-4">
      <div className="col-lg-7">
        <h1 className="h4 mb-4">Customer information</h1>

        {!hasShippingRegions ? (
          <div className="alert alert-warning" role="alert">
            Shipping is currently not configured for this store. Please contact the shop owner.
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="customerName">
              Full name <span className="text-danger">*</span>
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              className="form-control"
              value={form.customerName}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="customerEmail">
              Email address <span className="text-danger">*</span>
            </label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              className="form-control"
              value={form.customerEmail}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="customerPhone">
              Phone number <span className="text-danger">*</span>
            </label>
            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              className="form-control"
              value={form.customerPhone}
              onChange={handleChange}
              required
              autoComplete="tel"
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-8">
              <label className="form-label" htmlFor="customerStreet">
                Street <span className="text-danger">*</span>
              </label>
              <input
                id="customerStreet"
                name="customerStreet"
                type="text"
                className="form-control"
                value={form.customerStreet}
                onChange={handleChange}
                required
                autoComplete="address-line1"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label" htmlFor="customerHouseNumber">
                House number <span className="text-danger">*</span>
              </label>
              <input
                id="customerHouseNumber"
                name="customerHouseNumber"
                type="text"
                className="form-control"
                value={form.customerHouseNumber}
                onChange={handleChange}
                required
                autoComplete="address-line2"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label" htmlFor="customerPostalCode">
                Postal code <span className="text-danger">*</span>
              </label>
              <input
                id="customerPostalCode"
                name="customerPostalCode"
                type="text"
                className="form-control"
                value={form.customerPostalCode}
                onChange={handleChange}
                required
                autoComplete="postal-code"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label" htmlFor="customerCity">
                City <span className="text-danger">*</span>
              </label>
              <input
                id="customerCity"
                name="customerCity"
                type="text"
                className="form-control"
                value={form.customerCity}
                onChange={handleChange}
                required
                autoComplete="address-level2"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label" htmlFor="customerCountry">
                Country <span className="text-danger">*</span>
              </label>
              <select
                id="customerCountry"
                name="customerCountry"
                className="form-select"
                value={form.customerCountry}
                onChange={handleChange}
                required
                disabled={!hasShippingRegions}
                autoComplete="country-name"
              >
                {shippingRegions.map((region) => (
                  <option key={region.id} value={region.country}>
                    {region.country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-dark w-100" disabled={submitting || !hasShippingRegions}>
            {submitting ? "Redirecting to payment…" : "Proceed to payment"}
          </button>
        </form>
      </div>

      <div className="col-lg-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h5 mb-3">Your order</h2>
            <div className="d-flex flex-column gap-2 mb-3">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId ?? ""}`}
                  className="d-flex justify-content-between small"
                >
                  <span>
                    {item.productName}
                    {item.variantName ? <span className="text-secondary"> - {item.variantName}</span> : null}
                    <span className="text-secondary ms-1">x {item.quantity}</span>
                  </span>
                  <span className="ms-2 flex-shrink-0">{fmt(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <hr />

            <div className="d-flex justify-content-between small mb-1">
              <span className="text-secondary">Subtotal</span>
              <span>{fmt(totalPrice)}</span>
            </div>

            <div className="d-flex justify-content-between small mb-2">
              <span className="text-secondary">Shipping</span>
              <span>{selectedShippingRegion ? fmt(shippingCost) : "-"}</span>
            </div>

            {selectedShippingRegion && selectedShippingRegion.freeShippingFrom !== null ? (
              <p className="small text-secondary mb-2">
                Free shipping from {fmt(selectedShippingRegion.freeShippingFrom)}.
              </p>
            ) : null}

            <div className="d-flex justify-content-between fw-bold">
              <span>Total</span>
              <span>{fmt(totalWithShipping)}</span>
            </div>

            <p className="small text-secondary mt-1 mb-0">All prices include VAT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
