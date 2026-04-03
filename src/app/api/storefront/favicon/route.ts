import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getStoreByDomain, isPlatformDomain, normalizeDomainFromHost } from "@/lib/storefront";

const DEFAULT_ICON_PATH = "/sidecommerce-admin-favicon.svg";

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

function redirectToDefaultIcon(request: NextRequest) {
  return NextResponse.redirect(new URL(DEFAULT_ICON_PATH, request.url));
}

export async function GET(request: NextRequest) {
  const domain = normalizeDomainFromHost(request.headers.get("host") ?? "");
  if (isPlatformDomain(domain)) {
    return redirectToDefaultIcon(request);
  }

  const store = await getStoreByDomain(domain);
  if (!store?.faviconPath || !store.faviconPath.startsWith("/uploads/")) {
    return redirectToDefaultIcon(request);
  }

  const absolutePath = resolvePublicUploadPath(store.faviconPath);
  if (!absolutePath) {
    return redirectToDefaultIcon(request);
  }

  try {
    const data = await readFile(absolutePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": getContentType(store.faviconPath),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return redirectToDefaultIcon(request);
  }
}
