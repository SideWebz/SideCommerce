import { NextRequest, NextResponse } from "next/server";
import {
  databaseUnavailableResponse,
  isDatabaseUnavailableError,
  withDatabaseFallback,
} from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const formData = await request.formData();
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const brand = (formData.get("brand") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const productType = (formData.get("productType") as string | null)?.trim() ?? "SIMPLE";
    const priceValue = (formData.get("price") as string | null)?.trim() ?? "";
    const stockValue = (formData.get("stock") as string | null)?.trim() ?? "";
    const variantsValue = (formData.get("variants") as string | null)?.trim() ?? "";
    let simplePrice: number | null = null;
    let simpleStock: number | null = null;
    let variants: Array<{ name: string; price: number; stock: number }> = [];

    if (!name || !brand || !description) {
      return NextResponse.json({ message: "Name, brand, and description are required" }, { status: 400 });
    }

    if (productType !== "SIMPLE" && productType !== "VARIABLE") {
      return NextResponse.json({ message: "Invalid product type" }, { status: 400 });
    }

    if (productType === "SIMPLE") {
      if (!priceValue || !stockValue) {
        return NextResponse.json({ message: "Price and stock are required for simple products" }, { status: 400 });
      }

      const price = Number(priceValue);
      const stock = Number(stockValue);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ message: "Price must be a valid number greater than or equal to 0" }, { status: 400 });
      }

      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ message: "Stock must be an integer greater than or equal to 0" }, { status: 400 });
      }

      simplePrice = price;
      simpleStock = stock;
    }

    if (productType === "VARIABLE") {
      let parsed: unknown;

      try {
        parsed = JSON.parse(variantsValue || "[]");
      } catch {
        return NextResponse.json({ message: "Invalid variants payload" }, { status: 400 });
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json({ message: "At least one variant is required for variable products" }, { status: 400 });
      }

      for (const entry of parsed) {
        if (typeof entry !== "object" || entry === null) {
          return NextResponse.json({ message: "Invalid variants payload" }, { status: 400 });
        }

        const candidate = entry as { name?: unknown; price?: unknown; stock?: unknown };
        const variantName = typeof candidate.name === "string" ? candidate.name.trim() : "";
        const variantPrice = Number(candidate.price);
        const variantStock = Number(candidate.stock);

        if (!variantName || !Number.isFinite(variantPrice) || variantPrice < 0 || !Number.isInteger(variantStock) || variantStock < 0) {
          return NextResponse.json({ message: "Each variant needs valid name, price, and stock" }, { status: 400 });
        }

        variants.push({
          name: variantName,
          price: variantPrice,
          stock: variantStock,
        });
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          brand,
          description,
          productType,
          price: simplePrice,
          stock: simpleStock,
        },
      });

      if (productType === "VARIABLE") {
        await tx.variant.createMany({
          data: variants.map((variant) => ({
            productId: createdProduct.id,
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
          })),
        });
      }

      return createdProduct;
    });

    return NextResponse.json({ message: "Product created", productId: product.id });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }

    console.error("Product create failed", error);
    return NextResponse.json({ message: "Unexpected server error while creating product" }, { status: 500 });
  }
});
