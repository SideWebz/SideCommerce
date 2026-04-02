import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001") {
    return true;
  }

  if (error instanceof Error && error.message.includes("Can't reach database server")) {
    return true;
  }

  return false;
}

export function databaseUnavailableResponse() {
  return NextResponse.json(
    { message: "Database is temporarily unavailable. Please try again shortly." },
    { status: 503 },
  );
}

export function withDatabaseFallback<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return databaseUnavailableResponse();
      }

      throw error;
    }
  };
}
