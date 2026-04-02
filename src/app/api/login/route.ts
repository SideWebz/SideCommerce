import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthRedirectTarget } from "@/lib/storefront";

export const POST = withDatabaseFallback(async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const passwordValid = await compare(password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const session = await createSession(user.id);
  const redirectTo = getAuthRedirectTarget(request.headers.get("host"));
  const isFetchClient = request.headers.get("x-sidecommerce-client") === "web";
  const response = isFetchClient
    ? NextResponse.json({ message: "Login successful", redirectTo })
    : NextResponse.redirect(redirectTo, { status: 303 });

  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });

  return response;
});
