import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { CategoriesManager } from "@/components/categories-manager";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingCategorySchemaError } from "@/lib/prisma-schema-errors";

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  let isCategorySchemaMissing = false;
  let categories: Array<{ id: string; name: string; _count: { products: number } }> = [];

  if (store) {
    try {
      categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    } catch (error) {
      if (isMissingCategorySchemaError(error)) {
        isCategorySchemaMissing = true;
      } else {
        throw error;
      }
    }
  }

  return (
    <>
      <Navbar active="categories" />
      <main className="container py-5">
        <div className="mb-4">
          <h1 className="h3 mb-1">Categories</h1>
          <p className="text-secondary mb-0">Organize products into reusable groups.</p>
        </div>

        {!store ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center">
              <p className="text-secondary mb-3">You need a store before you can manage categories.</p>
              <Link href="/store" className="btn btn-dark">
                Create a store
              </Link>
            </div>
          </div>
        ) : isCategorySchemaMissing ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h2 className="h5 mb-2">Database Migration Required</h2>
              <p className="text-secondary mb-0">
                Category tables are missing in your current database. Run your Prisma migrations to enable category
                management.
              </p>
            </div>
          </div>
        ) : (
          <CategoriesManager
            initialCategories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              productCount: category._count.products,
            }))}
          />
        )}
      </main>
    </>
  );
}
