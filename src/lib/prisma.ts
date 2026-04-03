import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient();
}

let prismaClient: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prismaClient = createPrismaClient();
} else {
  global.prisma?.$disconnect().catch(() => undefined);
  prismaClient = createPrismaClient();
  global.prisma = prismaClient;
}

export const prisma = prismaClient;
