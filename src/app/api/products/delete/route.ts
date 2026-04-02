import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { rmdir, unlink } from "fs/promises";
import path from "path";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = (formData.get("id") as string | null)?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ message: "Product id is required" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        select: {
          filePath: true,
        },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const publicRoot = path.resolve(process.cwd(), "public");

  for (const image of existing.images) {
    const absoluteFilePath = path.resolve(publicRoot, `.${image.filePath}`);
    if (!absoluteFilePath.startsWith(publicRoot)) {
      return NextResponse.json({ message: "Invalid image path" }, { status: 400 });
    }

    try {
      await unlink(absoluteFilePath);
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== "ENOENT") {
        return NextResponse.json({ message: "Failed to delete product image file" }, { status: 500 });
      }
    }
  }

  await prisma.product.delete({ where: { id } });

  // Remove the product folder if it is now empty
  const productDir = path.join(publicRoot, "uploads", "products", id);
  try {
    await rmdir(productDir);
  } catch {
    // Folder not empty or already gone — ignore
  }

  return NextResponse.json({ message: "Product deleted", deletedImages: existing.images.length });
});
