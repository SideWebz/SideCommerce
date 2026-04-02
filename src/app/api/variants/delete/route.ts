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

  if (!id) {
    return NextResponse.json({ message: "Variant id is required" }, { status: 400 });
  }

  const existing = await prisma.variant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Variant not found" }, { status: 404 });
  }

  await prisma.variant.delete({ where: { id } });

  const summary = await getVariantSummary(existing.productId);

  return NextResponse.json({
    message: "Variant deleted",
    variantId: id,
    productId: existing.productId,
    summary,
  });
});
