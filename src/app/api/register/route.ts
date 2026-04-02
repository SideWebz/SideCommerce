import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthRedirectTarget } from "@/lib/storefront";

export const POST = withDatabaseFallback(async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2 || !email.includes("@") || phone.length < 6 || password.length < 6) {
    return NextResponse.json({ message: "Use valid name, email, phone and password (6+)" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ message: "Email already registered" }, { status: 409 });
  }

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    return NextResponse.json({ message: "Phone already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
    },
  });

  const session = await createSession(user.id);
  const redirectTo = getAuthRedirectTarget(request.headers.get("host"));
  const isFetchClient = request.headers.get("x-sidecommerce-client") === "web";
  const response = isFetchClient
    ? NextResponse.json({ message: "Registration successful", redirectTo })
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
