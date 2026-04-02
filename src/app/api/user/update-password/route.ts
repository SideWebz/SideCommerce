import { compare, hash } from "bcryptjs";
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
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 6) {
    return NextResponse.json({ message: "New password must be 6+ chars" }, { status: 400 });
  }

  const currentValid = await compare(currentPassword, user.passwordHash);
  if (!currentValid) {
    return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ message: "Password updated" });
});
