import { NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: user.id } });

  const response = NextResponse.json({ message: "Account deleted", redirectTo: "/register" });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
});
