import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProductEditForm } from "@/components/product-edit-form";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Params) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { id: "asc" } },
      images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      outgoingLinks: {
        where: { relationType: "RELATED" },
        include: { linkedProduct: true },
        orderBy: { linkedProduct: { name: "asc" } },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const editableProduct = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    description: product.description,
    productType: product.productType,
    price: product.price === null ? null : Number(product.price),
    stock: product.stock,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: Number(variant.price),
      stock: variant.stock,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      filePath: image.filePath,
      sortOrder: image.sortOrder,
    })),
    linkedProducts: product.outgoingLinks.map((link) => ({
      id: link.linkedProduct.id,
      name: link.linkedProduct.name,
      brand: link.linkedProduct.brand,
      description: link.linkedProduct.description,
    })),
  };

  return (
    <>
      <Navbar active="products" />
      <main className="container py-5">
        <div className="mb-4">
          <h1 className="h3 mb-1">Edit Product</h1>
          <p className="text-secondary mb-0">Update base info, images, variants, and linked products.</p>
        </div>

        <ProductEditForm initialProduct={editableProduct} />
      </main>
    </>
  );
}
