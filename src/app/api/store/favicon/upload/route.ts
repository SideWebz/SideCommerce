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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function getFileExtension(filename: string, mimeType: string) {
  const extFromName = path.extname(filename).toLowerCase();
  if (extFromName) {
    return extFromName;
  }

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/x-icon" || mimeType === "image/vnd.microsoft.icon") return ".ico";

  return ".bin";
}

function toAbsolutePublicPath(filePath: string) {
  return path.join(process.cwd(), "public", filePath.replace(/^\/+/, ""));
}

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const store = await prisma.store.findUnique({ where: { userId: user.id } });
    if (!store) {
      return NextResponse.json({ message: "No store found" }, { status: 404 });
    }

    const formData = await request.formData();
    const favicon = formData.get("favicon");

    if (!favicon) {
      return NextResponse.json({ message: "Favicon file is required" }, { status: 400 });
    }

    if (typeof favicon === "string") {
      return NextResponse.json({ message: "Favicon must be uploaded as a file" }, { status: 400 });
    }

    if (!(favicon instanceof File)) {
      return NextResponse.json({ message: "Invalid favicon payload" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(favicon.type)) {
      return NextResponse.json({ message: "Unsupported favicon file type" }, { status: 400 });
    }

    if (favicon.size <= 0 || favicon.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Favicon size must be between 1 byte and 2 MB" }, { status: 400 });
    }

    const ext = getFileExtension(favicon.name, favicon.type);
    const fileName = `${randomUUID()}${ext}`;
    const relativeDir = path.join("uploads", "stores", store.id, "favicon");
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    const absolutePath = path.join(absoluteDir, fileName);
    const filePath = `/${relativeDir}/${fileName}`;

    await mkdir(absoluteDir, { recursive: true });
    const buffer = Buffer.from(await favicon.arrayBuffer());
    await writeFile(absolutePath, buffer);

    try {
      await prisma.store.update({
        where: { id: store.id },
        data: { faviconPath: filePath },
      });

      if (store.faviconPath?.startsWith("/uploads/") && store.faviconPath !== filePath) {
        await unlink(toAbsolutePublicPath(store.faviconPath)).catch(() => undefined);
      }

      return NextResponse.json({
        message: "Store favicon updated",
        faviconPath: filePath,
      });
    } catch (dbError) {
      if (isDatabaseUnavailableError(dbError)) {
        return databaseUnavailableResponse();
      }

      await unlink(absolutePath).catch(() => undefined);
      console.error("Store favicon DB save failed", dbError);
      return NextResponse.json({ message: "Failed to save store favicon" }, { status: 500 });
    }
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }

    console.error("Store favicon upload failed", error);
    return NextResponse.json({ message: "Unexpected server error while uploading favicon" }, { status: 500 });
  }
});
