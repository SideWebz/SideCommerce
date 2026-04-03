import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  getStoreByDomain,
  getStorefrontCartAvailability,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";

export async function POST(req: Request) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    return NextResponse.json({ message: "Store not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { items } = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(items)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const normalizedItems = items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    if (typeof record.productId !== "string") {
      return [];
    }

    return [{
      productId: record.productId,
      variantId: typeof record.variantId === "string" ? record.variantId : null,
    }];
  });

  const availability = await getStorefrontCartAvailability(store.id, normalizedItems);

  return NextResponse.json({ message: "Cart availability fetched", availability });
}