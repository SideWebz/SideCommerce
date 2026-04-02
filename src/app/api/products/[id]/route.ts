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

  if (!id) {
    return NextResponse.json({ message: "Product id is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Product fetched", product });
});
