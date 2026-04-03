import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { OrderPackagingFlow } from "@/components/order-packaging-flow";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { isPlatformDomain, normalizeDomainFromHost } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v);

type Params = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Params) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (!isPlatformDomain(domain)) {
    notFound();
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    redirect("/store");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id, archivedAt: null },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) {
    notFound();
  }

  const items = order.items.map((i) => ({
    id: i.id,
    productName: i.productName,
    variantName: i.variantName,
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    subtotal: Number(i.subtotal),
  }));

  return (
    <>
      <Navbar active="orders" />
      <main className="container py-5">
        {/* Back link */}
        <div className="mb-4">
          <Link href="/" className="text-secondary text-decoration-none small">
            ← Back to orders
          </Link>
        </div>

        <div className="row g-4">
          {/* Left column: order info + items */}
          <div className="col-lg-7 d-flex flex-column gap-4">
            {/* Order info */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h1 className="h5 mb-1">Order details</h1>
                    <span className="font-monospace small text-secondary">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-secondary small">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <hr />

                <h2 className="h6 fw-semibold mb-3">Customer</h2>
                <dl className="row small mb-0">
                  <dt className="col-sm-4 text-secondary fw-normal">Name</dt>
                  <dd className="col-sm-8">{order.customerName}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Email</dt>
                  <dd className="col-sm-8">{order.customerEmail}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Phone</dt>
                  <dd className="col-sm-8">{order.customerPhone}</dd>
                  <dt className="col-sm-4 text-secondary fw-normal">Status</dt>
                  <dd className="col-sm-8 text-capitalize">{order.status.replaceAll("_", " ")}</dd>
                  {order.trackingCode && (
                    <>
                      <dt className="col-sm-4 text-secondary fw-normal">Tracking code</dt>
                      <dd className="col-sm-8 font-monospace">{order.trackingCode}</dd>
                    </>
                  )}
                  {order.molliePaymentId && (
                    <>
                      <dt className="col-sm-4 text-secondary fw-normal">Mollie ID</dt>
                      <dd className="col-sm-8 font-monospace small">{order.molliePaymentId}</dd>
                    </>
                  )}
                  <dt className="col-sm-4 text-secondary fw-normal">Address</dt>
                  <dd className="col-sm-8" style={{ whiteSpace: "pre-wrap" }}>
                    {order.customerAddress}
                  </dd>
                </dl>
              </div>
            </div>

            {/* Items table */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h2 className="h6 fw-semibold mb-3">Items</h2>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold text-secondary small">Product</th>
                        <th className="fw-semibold text-secondary small text-center">Qty</th>
                        <th className="fw-semibold text-secondary small text-end">Unit price</th>
                        <th className="fw-semibold text-secondary small text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2">
                            <span className="fw-medium">{item.productName}</span>
                            {item.variantName && (
                              <span className="small text-secondary d-block">
                                {item.variantName}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-center text-secondary">{item.quantity}</td>
                          <td className="py-2 text-end text-secondary">{fmt(item.unitPrice)}</td>
                          <td className="py-2 text-end fw-semibold">{fmt(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-end fw-bold border-top pt-2">
                          Total
                        </td>
                        <td className="text-end fw-bold border-top pt-2">
                          {fmt(Number(order.totalAmount))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: packaging workflow */}
          <div className="col-lg-5">
            <h2 className="h5 mb-3">Fulfilment</h2>
            <OrderPackagingFlow
              orderId={order.id}
              initialStatus={
                order.status as
                  | "pending"
                  | "confirmed"
                  | "failed"
                  | "canceled"
                  | "packaging"
                  | "ready_to_ship"
                  | "shipped"
              }
              initialTrackingCode={order.trackingCode}
              items={items}
              customerName={order.customerName}
              customerAddress={order.customerAddress}
              customerEmail={order.customerEmail}
              customerPhone={order.customerPhone}
              totalAmount={Number(order.totalAmount)}
            />
          </div>
        </div>
      </main>
    </>
  );
}
