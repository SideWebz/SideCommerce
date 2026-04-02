import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withDatabaseFallback(async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return NextResponse.json({
    message: "Categories fetched",
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      productCount: category._count.products,
    })),
  });
});
