import { NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2 || phone.length < 6) {
    return NextResponse.json({ message: "Invalid name or phone" }, { status: 400 });
  }

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone && existingPhone.id !== user.id) {
    return NextResponse.json({ message: "Phone already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone },
  });

  return NextResponse.json({ message: "Profile updated" });
});
