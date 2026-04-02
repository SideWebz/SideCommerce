"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiResult = {
  message?: string;
  redirectTo?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/login", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "x-sidecommerce-client": "web",
      },
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setError(data.message ?? "Login failed");
      return;
    }

    const redirectTo = data.redirectTo ?? "/";
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      window.location.assign(redirectTo);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="container min-vh-100 d-flex align-items-center justify-content-center py-4">
      <section className="card shadow-sm auth-card w-100 border-0">
        <div className="card-body p-4 p-md-5">
          <h1 className="h3 mb-1">Login</h1>
          <p className="text-secondary mb-4">Sign in to continue to SideCommerce.</p>
          <form action="/api/login" method="post" onSubmit={handleSubmit} className="d-grid gap-3">
            <input className="form-control form-control-lg" type="email" name="email" placeholder="Email" required />
            <input
              className="form-control form-control-lg"
              type="password"
              name="password"
              placeholder="Password"
              required
            />
            <button className="btn btn-dark btn-lg" type="submit">
              Login
            </button>
        </form>
          {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
          <p className="mt-4 mb-0 text-secondary">
          No account yet?{" "}
            <Link className="fw-semibold text-decoration-none" href="/register">
            Register
          </Link>
        </p>
        </div>
      </section>
    </main>
  );
}
