import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export const GET = withDatabaseFallback(async function GET(request: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const { id } = await params;
  const relationType = request.nextUrl.searchParams.get("relationType")?.trim() || undefined;

  if (!id) {
    return NextResponse.json({ message: "Product id is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const links = await prisma.productLink.findMany({
    where: {
      productId: id,
      ...(relationType ? { relationType } : {}),
    },
    include: {
      linkedProduct: {
        select: {
          id: true,
          name: true,
          brand: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { linkedProduct: { name: "asc" } },
  });

  return NextResponse.json({
    message: "Linked products fetched",
    productId: id,
    linkedCount: links.length,
    links: links.map((link) => ({
      id: link.id,
      relationType: link.relationType,
      linkedProduct: link.linkedProduct,
    })),
  });
});
