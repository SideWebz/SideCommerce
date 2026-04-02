import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  databaseUnavailableResponse,
  isDatabaseUnavailableError,
  withDatabaseFallback,
} from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-constants";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(filename: string, mimeType: string) {
  const extFromName = path.extname(filename).toLowerCase();
  if (extFromName) {
    return extFromName;
  }

  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";

  return ".bin";
}

function getNextSortOrder(takenOrders: number[]) {
  for (let order = 1; order <= 4; order += 1) {
    if (!takenOrders.includes(order)) {
      return order;
    }
  }
  return null;
}

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const formData = await request.formData();
    const productId = (formData.get("productId") as string | null)?.trim() ?? "";
    const image = formData.get("image");

    if (!productId) {
      return NextResponse.json({ message: "Product id is required" }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json({ message: "Image file is required" }, { status: 400 });
    }

    if (typeof image === "string") {
      return NextResponse.json({ message: "Image must be uploaded as a file, URLs are not allowed" }, { status: 400 });
    }

    if (!(image instanceof File)) {
      return NextResponse.json({ message: "Invalid image payload" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return NextResponse.json({ message: "Unsupported image type" }, { status: 400 });
    }

    if (image.size <= 0 || image.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Image size must be between 1 byte and 5 MB" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const existingImages = await prisma.productImage.findMany({
      where: { productId },
      select: { sortOrder: true },
    });

    if (existingImages.length >= MAX_PRODUCT_IMAGES) {
      return NextResponse.json({ message: `A product can have at most ${MAX_PRODUCT_IMAGES} images` }, { status: 400 });
    }

    const takenOrders = existingImages
      .map((item) => item.sortOrder)
      .filter((order): order is number => typeof order === "number");

    const sortOrder = getNextSortOrder(takenOrders);
    if (!sortOrder) {
      return NextResponse.json({ message: "No available image slot left" }, { status: 400 });
    }

    const ext = getFileExtension(image.name, image.type);
    const fileName = `${randomUUID()}${ext}`;
    const relativeDir = path.join("uploads", "products", productId);
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    const absolutePath = path.join(absoluteDir, fileName);
    const filePath = `/${relativeDir}/${fileName}`;

    await mkdir(absoluteDir, { recursive: true });
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(absolutePath, buffer);

    try {
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          filePath,
          sortOrder,
        },
      });

      return NextResponse.json({
        message: "Image uploaded",
        image: {
          id: productImage.id,
          productId: productImage.productId,
          filePath: productImage.filePath,
          sortOrder: productImage.sortOrder,
        },
      });
    } catch (dbError) {
      if (isDatabaseUnavailableError(dbError)) {
        return databaseUnavailableResponse();
      }

      await unlink(absolutePath).catch(() => undefined);
      console.error("Image DB save failed after file write", dbError);
      return NextResponse.json({ message: "Failed to save image metadata" }, { status: 500 });
    }
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }

    console.error("Image upload failed", error);
    return NextResponse.json({ message: "Unexpected server error while uploading image" }, { status: 500 });
  }
});
