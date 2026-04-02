import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SettingsForms } from "@/components/settings-forms";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export default async function SettingsPage() {
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
            <h1 className="h4 mb-1">User settings</h1>
            <p className="text-secondary mb-0">Manage your account details.</p>
            <SettingsForms initialName={user.name} initialEmail={user.email} initialPhone={user.phone} />
          </div>
        </section>
      </main>
    </>
  );
}
