import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProductGrid } from "@/components/product-grid";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingCategorySchemaError } from "@/lib/prisma-schema-errors";

export default async function ProductsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  let isCategorySchemaMissing = false;
  let products: Array<{
    id: string;
    name: string;
    brand: string;
    productType: "SIMPLE" | "VARIABLE";
    price: number | null;
    stock: number | null;
    imagePath: string | null;
    variantPrices: number[];
    variantStockTotal: number;
    categoryIds: string[];
    linkedProducts: Array<{ id: string; name: string; imagePath: string | null }>;
  }> = [];
  let categories: Array<{ id: string; name: string; productCount: number }> = [];

  if (store) {
    try {
      const productsWithCategories = await prisma.product.findMany({
        include: {
          variants: true,
          images: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          categories: {
            include: {
              category: true,
            },
          },
          outgoingLinks: {
            include: {
              linkedProduct: {
                include: {
                  images: {
                    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      products = productsWithCategories.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        productType: product.productType,
        price: product.price === null ? null : Number(product.price),
        stock: product.stock,
        imagePath: product.images[0]?.filePath ?? null,
        variantPrices: product.variants.map((variant) => Number(variant.price)),
        variantStockTotal: product.variants.reduce((total, variant) => total + variant.stock, 0),
        categoryIds: product.categories.map((item) => item.categoryId),
        linkedProducts: product.outgoingLinks.map((link) => ({
          id: link.linkedProduct.id,
          name: link.linkedProduct.name,
          imagePath: link.linkedProduct.images[0]?.filePath ?? null,
        })),
      }));

      const categoryRows = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      categories = categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        productCount: category._count.products,
      }));
    } catch (error) {
      if (!isMissingCategorySchemaError(error)) {
        throw error;
      }

      isCategorySchemaMissing = true;

      const productsWithoutCategories = await prisma.product.findMany({
        include: {
          variants: true,
          images: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          outgoingLinks: {
            include: {
              linkedProduct: {
                include: {
                  images: {
                    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      products = productsWithoutCategories.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        productType: product.productType,
        price: product.price === null ? null : Number(product.price),
        stock: product.stock,
        imagePath: product.images[0]?.filePath ?? null,
        variantPrices: product.variants.map((variant) => Number(variant.price)),
        variantStockTotal: product.variants.reduce((total, variant) => total + variant.stock, 0),
        categoryIds: [],
        linkedProducts: product.outgoingLinks.map((link) => ({
          id: link.linkedProduct.id,
          name: link.linkedProduct.name,
          imagePath: link.linkedProduct.images[0]?.filePath ?? null,
        })),
      }));
    }
  }

  return (
    <>
      <Navbar active="products" />
      <main className="container py-5">
        <div className="mb-4">
          <h1 className="h3 mb-1">Products</h1>
          <p className="text-secondary mb-0">Manage the products in your store.</p>
        </div>

        {!store ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center">
              <p className="text-secondary mb-3">You need a store before you can add products.</p>
              <Link href="/store" className="btn btn-dark">
                Create a store
              </Link>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center text-secondary">
              <p className="mb-3">No products yet.</p>
              <Link href="/products/create" className="btn btn-dark">
                Add product
              </Link>
            </div>
          </div>
        ) : (
          <>
            {isCategorySchemaMissing ? (
              <div className="alert alert-warning" role="alert">
                Category tables are missing in your database. Run Prisma migrations to enable category assignment and
                category filters.
              </div>
            ) : null}

            <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mb-3">
              <Link href="/products/create" className="btn btn-dark">
                Add product
              </Link>
            </div>

            <ProductGrid
              initialProducts={products}
              categories={categories}
            />
          </>
        )}
      </main>
    </>
  );
}
