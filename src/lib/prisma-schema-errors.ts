import { Prisma } from "@prisma/client";

export function isMissingCategorySchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021") {
    return false;
  }

  const meta = error.meta as { modelName?: string; table?: string } | undefined;
  const modelName = meta?.modelName ?? "";
  const table = meta?.table ?? "";

  return (
    modelName === "Category" ||
    modelName === "ProductCategory" ||
    table === "public.Category" ||
    table === "public.ProductCategory"
  );
}
