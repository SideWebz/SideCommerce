import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (!id || !name) {
    return NextResponse.json({ message: "Category id and name are required" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({
      message: "Category updated",
      category: {
        id: category.id,
        name: category.name,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Category name already exists" }, { status: 409 });
    }

    throw error;
  }
});
