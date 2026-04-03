"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OrderItem = {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type OrderStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "canceled"
  | "packaging"
  | "ready_to_ship"
  | "shipped";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  initialTrackingCode: string | null;
  items: OrderItem[];
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Payment confirmed",
  failed: "Payment failed",
  canceled: "Payment canceled",
  packaging: "Packaging",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "bg-warning-subtle text-warning-emphasis",
  confirmed: "bg-success-subtle text-success-emphasis",
  failed: "bg-danger-subtle text-danger-emphasis",
  canceled: "bg-secondary-subtle text-secondary-emphasis",
  packaging: "bg-warning-subtle text-warning-emphasis",
  ready_to_ship: "bg-info-subtle text-info-emphasis",
  shipped: "bg-success-subtle text-success-emphasis",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

async function updateStatus(orderId: string, status: OrderStatus, trackingCode?: string) {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, trackingCode }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? "Failed to update status");
  }
}

async function archiveOrder(orderId: string) {
  const res = await fetch(`/api/orders/${orderId}/archive`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? "Failed to archive order");
  }
}

// Explode items so each "unit" becomes its own step
function buildPackagingSteps(items: OrderItem[]) {
  const steps: { itemId: string; label: string; stepIndex: number }[] = [];
  for (const item of items) {
    const label = item.variantName
      ? `${item.productName} — ${item.variantName}`
      : item.productName;
    for (let i = 0; i < item.quantity; i++) {
      steps.push({ itemId: item.id, label, stepIndex: steps.length });
    }
  }
  return steps;
}

export function OrderPackagingFlow({
  orderId,
  initialStatus,
  initialTrackingCode,
  items,
  customerName,
  customerAddress,
  customerEmail,
  customerPhone,
  totalAmount,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelPrinted, setLabelPrinted] = useState(false);
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode ?? "");

  const steps = buildPackagingSteps(items);
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];
  const allPacked = currentStep >= totalSteps;

  async function transition(newStatus: OrderStatus, nextTrackingCode?: string) {
    setError(null);
    setLoading(true);
    try {
      await updateStatus(orderId, newStatus, nextTrackingCode);
      setStatus(newStatus);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleMarkPacked() {
    setCurrentStep((s) => s + 1);
    // When last item is packed, auto-advance status to ready_to_ship
    if (currentStep + 1 >= totalSteps && status === "packaging") {
      transition("ready_to_ship");
    }
  }

  function handlePrintLabel() {
    setLabelPrinted(true);
  }

  async function handleShipParcel() {
    const normalizedTrackingCode = trackingCode.trim();
    if (!normalizedTrackingCode) {
      setError("Enter the tracking code before shipping the parcel.");
      return;
    }

    await transition("shipped", normalizedTrackingCode);
  }

  async function handleArchiveOrder() {
    setError(null);
    setLoading(true);
    try {
      await archiveOrder(orderId);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      {/* ── Status badge ─────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-2">
        <span className="text-secondary small">Status:</span>
        <span className={`badge ${STATUS_BADGE[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* ── Workflow section ─────────────────────────────────────────── */}
      {status === "pending" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <p className="text-secondary mb-2">Waiting for payment confirmation.</p>
            <p className="small text-secondary mb-0">
              This order will be ready to fulfil once the customer completes payment.
            </p>
          </div>
        </div>
      )}

      {(status === "failed" || status === "canceled") && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <p className="text-danger mb-2">
              {status === "failed" ? "Payment failed." : "Payment was canceled."}
            </p>
            <p className="small text-secondary mb-0">
              No action is required. The order will not be fulfilled.
            </p>
            {status === "canceled" && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-3"
                disabled={loading}
                onClick={handleArchiveOrder}
              >
                {loading ? "Archiving..." : "Archive order"}
              </button>
            )}
          </div>
        </div>
      )}

      {status === "confirmed" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <p className="text-secondary mb-3">
              Payment confirmed. Ready to fulfil this order? Start the packaging process.
            </p>
            <button
              type="button"
              className="btn btn-dark"
              disabled={loading}
              onClick={() => {
                transition("packaging");
                setCurrentStep(0);
              }}
            >
              {loading ? "Starting…" : "Start Packaging"}
            </button>
          </div>
        </div>
      )}

      {status === "packaging" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-semibold mb-0">Pack items</h2>
              <span className="badge bg-dark">
                {Math.min(currentStep, totalSteps)} / {totalSteps} packed
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress mb-4" style={{ height: 6 }}>
              <div
                className="progress-bar bg-dark"
                role="progressbar"
                style={{ width: `${(Math.min(currentStep, totalSteps) / totalSteps) * 100}%` }}
                aria-valuenow={Math.min(currentStep, totalSteps)}
                aria-valuemin={0}
                aria-valuemax={totalSteps}
              />
            </div>

            {!allPacked && currentStepData ? (
              <div className="d-flex align-items-center justify-content-between border rounded p-3 bg-light">
                <div>
                  <p className="fw-semibold mb-0">{currentStepData.label}</p>
                  <p className="small text-secondary mb-0">
                    Unit {currentStep + 1} of {totalSteps}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleMarkPacked}
                  disabled={loading}
                >
                  Mark as packed ✓
                </button>
              </div>
            ) : (
              <div className="text-center text-success py-2">
                <p className="fw-semibold mb-0">All items packed!</p>
                <p className="small text-secondary">Advancing to ready-to-ship…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "ready_to_ship" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h6 fw-semibold mb-3">Shipping preparation</h2>

            {/* Step 1: Print label */}
            <div className="border rounded p-3 mb-3 d-flex align-items-start gap-3">
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${labelPrinted ? "bg-success text-white" : "bg-light text-secondary"}`}
                style={{ width: 32, height: 32, fontSize: 14, fontWeight: 600 }}
              >
                {labelPrinted ? "✓" : "1"}
              </div>
              <div className="flex-grow-1">
                <p className="fw-semibold mb-1">Print shipping label</p>
                <p className="small text-secondary mb-2">
                  Print the label in your shipping tool before dispatching this order.
                </p>
                <div className="small text-secondary mb-3 border rounded p-2 bg-light">
                  <strong>Ship to:</strong> {customerName}<br />
                  {customerAddress}
                </div>
                {!labelPrinted ? (
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm"
                    onClick={handlePrintLabel}
                  >
                    Print shipping label
                  </button>
                ) : (
                  <span className="text-success small fw-medium">Label printed</span>
                )}
              </div>
            </div>

            <div className={`border rounded p-3 mb-3 d-flex align-items-start gap-3 ${!labelPrinted ? "opacity-50" : ""}`}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${trackingCode.trim() ? "bg-success text-white" : "bg-light text-secondary"}`}
                style={{ width: 32, height: 32, fontSize: 14, fontWeight: 600 }}
              >
                {trackingCode.trim() ? "✓" : "2"}
              </div>
              <div className="flex-grow-1">
                <label htmlFor="trackingCode" className="fw-semibold mb-1 d-block">
                  Enter tracking code
                </label>
                <p className="small text-secondary mb-2">
                  Paste the code from your courier label so the order can be shipped.
                </p>
                <input
                  id="trackingCode"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 3SABC123456789"
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  disabled={!labelPrinted || loading}
                />
              </div>
            </div>

            <div className={`border rounded p-3 d-flex align-items-start gap-3 ${!labelPrinted || !trackingCode.trim() ? "opacity-50" : ""}`}>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-light text-secondary"
                style={{ width: 32, height: 32, fontSize: 14, fontWeight: 600 }}
              >
                3
              </div>
              <div className="flex-grow-1">
                <p className="fw-semibold mb-1">Ship parcel</p>
                <p className="small text-secondary mb-2">
                  Hand the parcel to the courier. This will mark the order as shipped.
                </p>
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  disabled={!labelPrinted || !trackingCode.trim() || loading}
                  onClick={handleShipParcel}
                >
                  {loading ? "Updating…" : "Ship Parcel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "shipped" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-success-subtle"
              style={{ width: 56, height: 56 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                className="text-success"
                viewBox="0 0 16 16"
              >
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
              </svg>
            </div>
            <p className="fw-semibold mb-1">Order shipped</p>
            <p className="text-secondary small mb-0">
              This order has been handed to the courier.
            </p>
            {trackingCode && (
              <p className="small mb-0 mt-2">
                Tracking code: <span className="font-monospace">{trackingCode}</span>
              </p>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-4"
              disabled={loading}
              onClick={handleArchiveOrder}
            >
              {loading ? "Archiving…" : "Archive order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
