import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, status: true, archivedAt: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  if (order.archivedAt) {
    return NextResponse.json({ message: "Order is already archived" }, { status: 409 });
  }

  if (!["shipped", "canceled"].includes(order.status)) {
    return NextResponse.json(
      { message: "Only shipped or canceled orders can be archived" },
      { status: 422 },
    );
  }

  const archivedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { archivedAt: new Date() },
    select: { archivedAt: true },
  });

  return NextResponse.json({
    message: "Order archived",
    archivedAt: archivedOrder.archivedAt?.toISOString() ?? null,
  });
});
