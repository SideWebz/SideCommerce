import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  await prisma.store.delete({ where: { userId: user.id } });

  return NextResponse.json({ message: "Store deleted" });
});
