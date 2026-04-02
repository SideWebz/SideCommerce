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
    const id = (formData.get("id") as string | null)?.trim() ?? "";
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const brand = (formData.get("brand") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const submittedProductType = (formData.get("productType") as string | null)?.trim() ?? "";
    const priceValue = (formData.get("price") as string | null)?.trim() ?? "";
    const stockValue = (formData.get("stock") as string | null)?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ message: "Product id is required" }, { status: 400 });
    }

    if (!name || !brand || !description) {
      return NextResponse.json({ message: "Name, brand, and description are required" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const productType = submittedProductType || existing.productType;
    if (productType !== "SIMPLE" && productType !== "VARIABLE") {
      return NextResponse.json({ message: "Invalid product type" }, { status: 400 });
    }

    const existingVariantCount = await prisma.variant.count({ where: { productId: id } });

    let price: number | null = null;
    let stock: number | null = null;

    if (productType === "SIMPLE") {
      if (!priceValue || !stockValue) {
        return NextResponse.json({ message: "Price and stock are required for simple products" }, { status: 400 });
      }

      const parsedPrice = Number(priceValue);
      const parsedStock = Number(stockValue);

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ message: "Price must be a valid number greater than or equal to 0" }, { status: 400 });
      }

      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        return NextResponse.json({ message: "Stock must be an integer greater than or equal to 0" }, { status: 400 });
      }

      price = parsedPrice;
      stock = parsedStock;
    }

    if (productType === "VARIABLE" && existingVariantCount === 0) {
      return NextResponse.json(
        { message: "Variable products must have at least one variant. Add a variant before saving base info." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (productType === "SIMPLE") {
        await tx.variant.deleteMany({ where: { productId: id } });
      }

      await tx.product.update({
        where: { id },
        data: {
          name,
          brand,
          description,
          productType,
          price,
          stock,
        },
      });
    });

    return NextResponse.json({ message: "Product updated" });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }

    console.error("Product update failed", error);
    return NextResponse.json({ message: "Unexpected server error while updating product" }, { status: 500 });
  }
});
