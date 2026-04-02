import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = (formData.get("id") as string | null)?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ message: "Category id is required" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({
    message: "Category deleted",
    removedAssignments: existing._count.products,
  });
});
