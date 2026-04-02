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
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";
  const categoryIdsValue = (formData.get("categoryIds") as string | null)?.trim() ?? "[]";

  if (!productId) {
    return NextResponse.json({ message: "Product id is required" }, { status: 400 });
  }

  let categoryIds: string[] = [];
  try {
    const parsed = JSON.parse(categoryIdsValue);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      return NextResponse.json({ message: "Invalid categoryIds payload" }, { status: 400 });
    }
    categoryIds = Array.from(new Set(parsed.map((id) => id.trim()).filter(Boolean)));
  } catch {
    return NextResponse.json({ message: "Invalid categoryIds payload" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  if (categoryIds.length > 0) {
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    if (existingCategories.length !== categoryIds.length) {
      return NextResponse.json({ message: "One or more categories were not found" }, { status: 404 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.productCategory.deleteMany({ where: { productId } });

    if (categoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId, categoryId })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({
    message: "Product categories updated",
    productId,
    categoryIds,
  });
});
