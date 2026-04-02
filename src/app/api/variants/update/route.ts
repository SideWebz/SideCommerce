import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVariantSummary } from "@/lib/variant-summary";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const priceValue = (formData.get("price") as string | null)?.trim() ?? "";
  const stockValue = (formData.get("stock") as string | null)?.trim() ?? "";

  if (!id || !name || !priceValue || !stockValue) {
    return NextResponse.json({ message: "id, name, price, and stock are required" }, { status: 400 });
  }

  const price = Number(priceValue);
  const stock = Number(stockValue);

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ message: "Price must be a valid number greater than or equal to 0" }, { status: 400 });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ message: "Stock must be an integer greater than or equal to 0" }, { status: 400 });
  }

  const existing = await prisma.variant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Variant not found" }, { status: 404 });
  }

  await prisma.variant.update({
    where: { id },
    data: {
      name,
      price,
      stock,
    },
  });

  const summary = await getVariantSummary(existing.productId);

  return NextResponse.json({
    message: "Variant updated",
    variantId: id,
    productId: existing.productId,
    summary,
  });
});
