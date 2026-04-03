"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

interface OrdersListAdminProps {
  storeName: string;
}

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  packaging: "Packaging",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
};

const STATUS_BADGE: Record<string, string> = {
  created: "bg-secondary-subtle text-secondary-emphasis",
  packaging: "bg-warning-subtle text-warning-emphasis",
  ready_to_ship: "bg-info-subtle text-info-emphasis",
  shipped: "bg-success-subtle text-success-emphasis",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

export function OrdersListAdmin({ storeName }: OrdersListAdminProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/orders/list?showArchived=${showArchived}`);
        const data = await response.json();
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [showArchived]);

  return (
    <>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h3 mb-1">Orders</h1>
          <p className="text-secondary mb-0">All orders for {storeName}.</p>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="showArchivedSwitch"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showArchivedSwitch">
            {showArchived ? "Archived only" : "Active orders"}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-5 text-center text-secondary">
            <p className="mb-0">Loading orders...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-5 text-center text-secondary">
            <p className="mb-0">
              {showArchived ? "No archived orders." : "No active orders."}
            </p>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 py-3 fw-semibold text-secondary small">Order ID</th>
                  <th className="py-3 fw-semibold text-secondary small">Customer</th>
                  <th className="py-3 fw-semibold text-secondary small">Items</th>
                  <th className="py-3 fw-semibold text-secondary small">Total</th>
                  <th className="py-3 fw-semibold text-secondary small">Status</th>
                  <th className="py-3 fw-semibold text-secondary small">Date</th>
                  <th className="pe-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const badgeClass =
                    STATUS_BADGE[order.status] ?? "bg-secondary-subtle text-secondary-emphasis";
                  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
                  return (
                    <tr key={order.id}>
                      <td className="ps-4 py-3">
                        <span className="font-monospace small text-secondary">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="fw-medium">{order.customerName}</span>
                        <br />
                        <span className="small text-secondary">{order.customerEmail}</span>
                      </td>
                      <td className="py-3 text-secondary small">
                        {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                      </td>
                      <td className="py-3 fw-semibold">{fmt(order.totalAmount)}</td>
                      <td className="py-3">
                        <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                      </td>
                      <td className="py-3 text-secondary small">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="pe-4 py-3 text-end">
                        <Link
                          href={`/orders/${order.id}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
