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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email.includes("@")) {
    return NextResponse.json({ message: "Invalid email" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.id !== user.id) {
    return NextResponse.json({ message: "Email already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email },
  });

  return NextResponse.json({ message: "Email updated" });
});
