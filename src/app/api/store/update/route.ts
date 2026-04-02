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

  const formData = await request.formData();
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const ibanNumber = (formData.get("ibanNumber") as string | null)?.trim() ?? "";
  const domain = (formData.get("domain") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const address = (formData.get("address") as string | null)?.trim() ?? "";
  const country = (formData.get("country") as string | null)?.trim() ?? "";
  const vatNumber = (formData.get("vatNumber") as string | null)?.trim() ?? "";
  const currency = (formData.get("currency") as string | null)?.trim() || "EUR";

  if (!name || !description || !ibanNumber || !domain || !phone || !address || !country || !vatNumber) {
    return NextResponse.json({ message: "All fields are required" }, { status: 400 });
  }

  await prisma.store.update({
    where: { userId: user.id },
    data: { name, description, ibanNumber, domain, phone, address, country, vatNumber, currency },
  });

  return NextResponse.json({ message: "Store updated" });
});
