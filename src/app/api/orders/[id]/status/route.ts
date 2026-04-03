import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderShippedEmail } from "@/lib/order-email-notifications";

const VALID_STATUSES = ["confirmed", "packaging", "ready_to_ship", "shipped"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  confirmed: "packaging",
  packaging: "ready_to_ship",
  ready_to_ship: "shipped",
  shipped: null,
};

type Params = { params: Promise<{ id: string }> };

export const POST = withDatabaseFallback(async function POST(
  request: NextRequest,
  { params }: Params,
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { status: newStatus, trackingCode } = (body ?? {}) as Record<string, unknown>;

  if (typeof newStatus !== "string" || !VALID_STATUSES.includes(newStatus as OrderStatus)) {
    return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
  }

  const currentStatus = order.status as OrderStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (allowed !== newStatus) {
    // Specific error when trying to start packaging on an unpaid order
    if (newStatus === "packaging" && order.status === "pending") {
      return NextResponse.json(
        { message: "Order not paid yet" },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { message: `Cannot transition from "${currentStatus}" to "${newStatus}"` },
      { status: 422 },
    );
  }

  const normalizedTrackingCode =
    typeof trackingCode === "string" && trackingCode.trim()
      ? trackingCode.trim()
      : null;

  if (newStatus === "shipped" && !normalizedTrackingCode) {
    return NextResponse.json({ message: "Tracking code is required before shipping" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      ...(newStatus === "shipped" ? { trackingCode: normalizedTrackingCode } : {}),
    },
  });

  if (newStatus === "shipped") {
    void sendOrderShippedEmail(order.id).catch((error) => {
      console.error("Failed to send order shipped email", error);
    });
  }

  return NextResponse.json({
    message: "Order status updated",
    status: newStatus,
    trackingCode: normalizedTrackingCode,
  });
});
