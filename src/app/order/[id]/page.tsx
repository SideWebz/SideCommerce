import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StorefrontNavbar } from "@/components/storefront-navbar";
import {
  getStoreByDomain,
  getStorefrontOrder,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

type Params = {
  params: Promise<{ id: string }>;
};

export default async function OrderConfirmationPage({ params }: Params) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    notFound();
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    notFound();
  }

  const { id } = await params;
  const order = await getStorefrontOrder(store.id, id);

  if (!order) {
    notFound();
  }

  const isShipped = order.status === "shipped";
  const isPending = order.status === "pending";
  const isFailed = order.status === "failed" || order.status === "canceled";

  return (
    <>
      <StorefrontNavbar storeName={store.name} />
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            {/* Status banner */}
            <div className="text-center mb-5">
              {isPending && (
                <>
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-warning-subtle"
                    style={{ width: 64, height: 64 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-warning" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                      <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
                    </svg>
                  </div>
                  <h1 className="h3 mb-1">Awaiting payment</h1>
                  <p className="text-secondary mb-0">
                    {`Hi ${order.customerName}, your order is waiting for payment confirmation.`}
                  </p>
                </>
              )}

              {isFailed && (
                <>
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-danger-subtle"
                    style={{ width: 64, height: 64 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-danger" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                    </svg>
                  </div>
                  <h1 className="h3 mb-1">Payment {order.status === "canceled" ? "canceled" : "failed"}</h1>
                  <p className="text-secondary mb-0">
                    {`Sorry ${order.customerName}, your payment could not be processed. Please try again.`}
                  </p>
                </>
              )}

              {!isPending && !isFailed && (
                <>
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-success-subtle"
                    style={{ width: 64, height: 64 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      fill="currentColor"
                      className="text-success"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
                    </svg>
                  </div>
                  <h1 className="h3 mb-1">{isShipped ? "Order shipped!" : "Order confirmed!"}</h1>
                  <p className="text-secondary mb-0">
                    {isShipped
                      ? `Good news, ${order.customerName}. Your order is on its way.`
                      : `Thank you, ${order.customerName}. Your payment was received and your order is being prepared.`}
                  </p>
                </>
              )}
            </div>

            {/* Order details card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-semibold mb-0">Order details</h2>
                  <span className="badge bg-secondary-subtle text-secondary-emphasis">
                    #{order.id.slice(-8).toUpperCase()}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2 mb-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="d-flex justify-content-between small"
                    >
                      <span>
                        {item.productName}
                        {item.variantName && (
                          <span className="text-secondary"> — {item.variantName}</span>
                        )}
                        <span className="text-secondary ms-1">× {item.quantity}</span>
                      </span>
                      <span className="ms-2 flex-shrink-0 fw-semibold">
                        {fmt(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>{fmt(order.totalAmount)}</span>
                </div>
                <p className="small text-secondary mt-1 mb-0">All prices include VAT</p>

                {order.status === "shipped" && order.trackingCode && (
                  <>
                    <hr />
                    <div className="small d-flex justify-content-between align-items-center">
                      <span className="text-secondary">Tracking code</span>
                      <span className="font-monospace fw-semibold">{order.trackingCode}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Customer info card */}
            <div className="card border-0 shadow-sm mb-5">
              <div className="card-body p-4">
                <h2 className="h6 fw-semibold mb-3">Shipping information</h2>
                <dl className="row small mb-0">
                  <dt className="col-sm-4 text-secondary fw-normal">Name</dt>
                  <dd className="col-sm-8">{order.customerName}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Email</dt>
                  <dd className="col-sm-8">{order.customerEmail}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Phone</dt>
                  <dd className="col-sm-8">{order.customerPhone}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Address</dt>
                  <dd className="col-sm-8" style={{ whiteSpace: "pre-wrap" }}>
                    {order.customerAddress}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="text-center">
              <Link href="/" className="btn btn-dark">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
