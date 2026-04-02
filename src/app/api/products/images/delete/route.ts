import { rmdir, unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  databaseUnavailableResponse,
  isDatabaseUnavailableError,
  withDatabaseFallback,
} from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const formData = await request.formData();
    const imageId = (formData.get("imageId") as string | null)?.trim() ?? "";
    const productId = (formData.get("productId") as string | null)?.trim() ?? "";

    if (!imageId || !productId) {
      return NextResponse.json({ message: "imageId and productId are required" }, { status: 400 });
    }

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    if (image.productId !== productId) {
      return NextResponse.json({ message: "Image does not belong to the provided product" }, { status: 400 });
    }

    const publicRoot = path.resolve(process.cwd(), "public");
    const absoluteFilePath = path.resolve(publicRoot, `.${image.filePath}`);

    if (!absoluteFilePath.startsWith(publicRoot)) {
      return NextResponse.json({ message: "Invalid file path" }, { status: 400 });
    }

    try {
      await unlink(absoluteFilePath);
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== "ENOENT") {
        return NextResponse.json({ message: "Failed to delete image file from storage" }, { status: 500 });
      }
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    // Remove the product folder if it is now empty
    const productDir = path.join(publicRoot, "uploads", "products", productId);
    try {
      await rmdir(productDir);
    } catch {
      // Folder not empty or already gone — ignore
    }

    return NextResponse.json({
      message: "Image deleted",
      imageId,
      productId,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }

    console.error("Image delete failed", error);
    return NextResponse.json({ message: "Unexpected server error while deleting image" }, { status: 500 });
  }
});
