"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SettingsFormsProps = {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
};

type ApiResult = {
  message?: string;
  redirectTo?: string;
};

type Flash = {
  kind: "success" | "error";
  message: string;
};

export function SettingsForms({ initialName, initialEmail, initialPhone }: SettingsFormsProps) {
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Request failed" });
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Updated" });

    if (endpoint.includes("update-password")) {
      form.reset();
    }

    if (data.redirectTo) {
      router.push(data.redirectTo);
      return;
    }

    router.refresh();
  }

  async function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.confirm("Delete your account permanently?")) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/user/delete", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Delete failed" });
      return;
    }

    if (data.redirectTo) {
      router.push(data.redirectTo);
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Account deleted" });
  }

  return (
    <>
      {flash?.kind === "success" ? <div className="alert alert-success mt-4 mb-0">{flash.message}</div> : null}
      {flash?.kind === "error" ? <div className="alert alert-danger mt-4 mb-0">{flash.message}</div> : null}

      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <form
            action="/api/user/update-profile"
            method="post"
            onSubmit={(event) => submitForm(event, "/api/user/update-profile")}
            className="settings-section h-100"
          >
            <h2 className="h6 mb-3">Profile</h2>
            <div className="d-grid gap-2">
              <input className="form-control" type="text" name="name" defaultValue={initialName} placeholder="Full name" required />
              <input className="form-control" type="tel" name="phone" defaultValue={initialPhone} placeholder="Phone number" required />
              <button className="btn btn-dark" type="submit">
                Save profile
              </button>
            </div>
          </form>
        </div>

        <div className="col-md-6">
          <form
            action="/api/user/update-email"
            method="post"
            onSubmit={(event) => submitForm(event, "/api/user/update-email")}
            className="settings-section h-100"
          >
            <h2 className="h6 mb-3">Email</h2>
            <div className="d-grid gap-2">
              <input className="form-control" type="email" name="email" defaultValue={initialEmail} placeholder="Email" required />
              <button className="btn btn-dark" type="submit">
                Update email
              </button>
            </div>
          </form>
        </div>

        <div className="col-12">
          <form
            action="/api/user/update-password"
            method="post"
            onSubmit={(event) => submitForm(event, "/api/user/update-password")}
            className="settings-section"
          >
            <h2 className="h6 mb-3">Password</h2>
            <div className="row g-2">
              <div className="col-md-6">
                <input className="form-control" type="password" name="currentPassword" placeholder="Current password" required />
              </div>
              <div className="col-md-6">
                <input className="form-control" type="password" name="newPassword" placeholder="New password (min 6 chars)" required />
              </div>
            </div>
            <button className="btn btn-dark mt-3" type="submit">
              Change password
            </button>
          </form>
        </div>

        <div className="col-12">
          <form action="/api/user/delete" method="post" onSubmit={submitDelete} className="settings-section border-danger-subtle bg-danger-subtle">
            <h2 className="h6 text-danger mb-2">Danger zone</h2>
            <p className="text-secondary mb-2">Delete your account permanently.</p>
            <button className="btn btn-danger" type="submit">
              Delete user
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
