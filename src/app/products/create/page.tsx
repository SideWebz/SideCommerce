import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProductCreateForm } from "@/components/product-create-form";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CreateProductPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });

  return (
    <>
      <Navbar active="products" />
      <main className="container py-5">
        <div className="mb-4">
          <h1 className="h3 mb-1">Create Product</h1>
          <p className="text-secondary mb-0">Set up a new product for your store.</p>
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
        ) : (
          <ProductCreateForm />
        )}
      </main>
    </>
  );
}
