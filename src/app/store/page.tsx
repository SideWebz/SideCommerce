import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { StoreForm } from "@/components/store-form";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StorePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });

  const storeData = store
    ? { ...store, createdAt: store.createdAt.toISOString() }
    : null;

  return (
    <>
      <Navbar active="store" />
      <main className="container py-4">
        <section className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h1 className="h4 mb-1">Store</h1>
            <p className="text-secondary mb-0">Manage your store details.</p>
            <div className="mt-4">
              <StoreForm store={storeData} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
