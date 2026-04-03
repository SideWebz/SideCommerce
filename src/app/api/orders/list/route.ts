import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withDatabaseFallback(async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const showArchived = url.searchParams.get("showArchived") === "true";

  const where: any = { storeId: store.id };
  if (showArchived) {
    where.archivedAt = { not: null };
  } else {
    where.archivedAt = null;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { select: { id: true, productName: true, variantName: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    message: "Orders fetched",
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      totalAmount: Number(o.totalAmount),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
    })),
  });
});
