import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isPrismaConnectivityError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getUserFromSessionToken(token?: string) {
  if (!token) {
    return null;
  }

  let session: Prisma.SessionGetPayload<{ include: { user: true } }> | null = null;

  try {
    session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
  } catch (error) {
    if (isPrismaConnectivityError(error)) {
      // If DB is temporarily unavailable, treat the request as unauthenticated.
      return null;
    }
    throw error;
  }

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session.user;
}

function getCookieValue(cookieHeader: string, name: string) {
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return undefined;
}

export async function getUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  return getUserFromSessionToken(token);
}
