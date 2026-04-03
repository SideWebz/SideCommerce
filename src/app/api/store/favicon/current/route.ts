import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function resolvePublicUploadPath(filePath: string) {
  const publicRoot = path.resolve(process.cwd(), "public");
  const absoluteFilePath = path.resolve(publicRoot, `.${filePath}`);
  if (!absoluteFilePath.startsWith(publicRoot)) {
    return null;
  }
  return absoluteFilePath;
}

export const GET = withDatabaseFallback(async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  if (!store.faviconPath || !store.faviconPath.startsWith("/uploads/")) {
    return NextResponse.json({ message: "No favicon found" }, { status: 404 });
  }

  const absolutePath = resolvePublicUploadPath(store.faviconPath);
  if (!absolutePath) {
    return NextResponse.json({ message: "Invalid favicon path" }, { status: 400 });
  }

  try {
    const data = await readFile(absolutePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": getContentType(store.faviconPath),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "Favicon file not found" }, { status: 404 });
  }
});
