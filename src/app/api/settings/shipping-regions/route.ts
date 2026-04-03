import { NextRequest, NextResponse } from "next/server";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ShippingRegionPayload = {
  country?: unknown;
  shippingCost?: unknown;
  freeShippingFrom?: unknown;
};

function normalizeCountry(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
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

  const rows = await prisma.shippingRegion.findMany({
    where: { storeId: store.id },
    orderBy: { country: "asc" },
  });

  return NextResponse.json({
    message: "Shipping regions fetched",
    regions: rows.map((row) => ({
      id: row.id,
      country: row.country,
      shippingCost: Number(row.shippingCost),
      freeShippingFrom: row.freeShippingFrom === null ? null : Number(row.freeShippingFrom),
    })),
  });
});

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  let payload: ShippingRegionPayload;
  try {
    payload = (await request.json()) as ShippingRegionPayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const country = normalizeCountry(payload.country);
  const shippingCost = parseAmount(payload.shippingCost);
  const freeShippingRaw = payload.freeShippingFrom;
  const freeShippingFrom =
    freeShippingRaw === null || freeShippingRaw === undefined || freeShippingRaw === ""
      ? null
      : parseAmount(freeShippingRaw);

  if (!country) {
    return NextResponse.json({ message: "Country is required" }, { status: 400 });
  }

  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    return NextResponse.json({ message: "Shipping cost must be 0 or higher" }, { status: 400 });
  }

  if (freeShippingFrom !== null && (!Number.isFinite(freeShippingFrom) || freeShippingFrom < 0)) {
    return NextResponse.json({ message: "Free shipping amount must be 0 or higher" }, { status: 400 });
  }

  await prisma.shippingRegion.upsert({
    where: {
      storeId_country: {
        storeId: store.id,
        country,
      },
    },
    create: {
      storeId: store.id,
      country,
      shippingCost,
      freeShippingFrom,
    },
    update: {
      shippingCost,
      freeShippingFrom,
    },
  });

  return NextResponse.json({ message: "Shipping region saved" });
});

export const DELETE = withDatabaseFallback(async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  let payload: { id?: unknown };
  try {
    payload = (await request.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!id) {
    return NextResponse.json({ message: "Region id is required" }, { status: 400 });
  }

  const existing = await prisma.shippingRegion.findFirst({
    where: {
      id,
      storeId: store.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ message: "Shipping region not found" }, { status: 404 });
  }

  await prisma.shippingRegion.delete({ where: { id } });

  return NextResponse.json({ message: "Shipping region removed" });
});
