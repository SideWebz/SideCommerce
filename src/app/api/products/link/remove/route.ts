import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_RELATION_TYPE = "RELATED";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const productId = (formData.get("productId") as string | null)?.trim() ?? "";
  const linkedProductId = (formData.get("linkedProductId") as string | null)?.trim() ?? "";
  const relationType = (formData.get("relationType") as string | null)?.trim() || DEFAULT_RELATION_TYPE;

  if (!productId || !linkedProductId) {
    return NextResponse.json({ message: "productId and linkedProductId are required" }, { status: 400 });
  }

  if (productId === linkedProductId) {
    return NextResponse.json({ message: "A product cannot unlink itself" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.productLink.deleteMany({
      where: {
        relationType,
        OR: [
          { productId, linkedProductId },
          { productId: linkedProductId, linkedProductId: productId },
        ],
      },
    }),
  ]);

  const linkedCount = await prisma.productLink.count({ where: { productId, relationType } });

  return NextResponse.json({
    message: "Linked products updated",
    productId,
    linkedProductId,
    relationType,
    linkedCount,
    mode: "symmetric",
  });
});
