import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { EmailTemplatesManager } from "@/components/email-templates-manager";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export default async function EmailSettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar active="settings" />
      <main className="container py-4">
        <section className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
              <h1 className="h4 mb-0">Email templates</h1>
              <div className="d-flex gap-2">
                <Link href="/settings" className="btn btn-sm btn-outline-secondary">Account</Link>
                <Link href="/settings/emails" className="btn btn-sm btn-dark">Emails</Link>
                <Link href="/settings/shipping" className="btn btn-sm btn-outline-secondary">Shipping</Link>
              </div>
            </div>
            <p className="text-secondary mb-0">
              Configure order notification templates for this store.
            </p>
            <EmailTemplatesManager />
          </div>
        </section>
      </main>
    </>
  );
}
