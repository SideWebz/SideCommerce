import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMollieClient } from "@/lib/mollie";
import { PaymentStatus } from "@mollie/api-client";

/**
 * POST /api/mollie/webhook
 *
 * Mollie calls this endpoint (possibly multiple times) when a payment status changes.
 * The body contains only `id=<molliePaymentId>`.
 * We re-fetch the payment from Mollie to verify the status before updating any order.
 */
export async function POST(req: Request) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const params = new URLSearchParams(rawBody);
  const paymentId = params.get("id");

  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ message: "Missing payment id" }, { status: 400 });
  }

  // Find the order tied to this payment
  const order = await prisma.order.findFirst({
    where: { molliePaymentId: paymentId },
    select: { id: true, status: true, paymentStatus: true },
  });

  if (!order) {
    // Return 200 so Mollie does not keep retrying for unknown payments
    return NextResponse.json({ message: "Unknown payment" });
  }

  // Don't allow a webhook to regress an order already past the payment phase
  const TERMINAL_ORDER_STATUSES = new Set(["packaging", "ready_to_ship", "shipped"]);
  if (TERMINAL_ORDER_STATUSES.has(order.status)) {
    return NextResponse.json({ message: "Order already fulfilled" });
  }

  // Verify and fetch real status from Mollie (never trust webhook payload alone)
  let mollieStatus: PaymentStatus;
  try {
    const mollie = getMollieClient();
    const payment = await mollie.payments.get(paymentId);
    mollieStatus = payment.status;
  } catch (err) {
    console.error("Failed to fetch Mollie payment", paymentId, err);
    return NextResponse.json({ message: "Mollie API error" }, { status: 502 });
  }

  // Map Mollie status → order status + payment status
  let newOrderStatus: string | null = null;
  let newPaymentStatus: string | null = null;

  switch (mollieStatus) {
    case PaymentStatus.paid:
    case PaymentStatus.authorized:
      newOrderStatus = "confirmed";
      newPaymentStatus = "paid";
      break;
    case PaymentStatus.failed:
      newOrderStatus = "failed";
      newPaymentStatus = "failed";
      break;
    case PaymentStatus.canceled:
      newOrderStatus = "canceled";
      newPaymentStatus = "canceled";
      break;
    case PaymentStatus.expired:
      newOrderStatus = "canceled";
      newPaymentStatus = "expired";
      break;
    default:
      // open / pending — no change until a final status arrives
      return NextResponse.json({ message: "Payment pending" });
  }

  // Idempotent: only write if something changed
  if (order.status !== newOrderStatus || order.paymentStatus !== newPaymentStatus) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newOrderStatus,
        paymentStatus: newPaymentStatus,
      },
    });
  }

  return NextResponse.json({ message: "Webhook processed" });
}
