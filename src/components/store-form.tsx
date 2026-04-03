"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type Store = {
  id: string;
  name: string;
  description: string;
  faviconPath: string | null;
  ibanNumber: string;
  domain: string;
  phone: string;
  address: string;
  country: string;
  vatNumber: string;
  currency: string;
  createdAt: string;
};

type Flash = { kind: "success" | "error"; message: string };

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "DKK", "SEK", "NOK"];

export function StoreForm({ store }: { store: Store | null }) {
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    const response = await fetch(endpoint, {
      method: "POST",
      body: new FormData(event.currentTarget),
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Request failed" });
      return;
    }
    setFlash({ kind: "success", message: data.message ?? "Saved" });
    router.refresh();
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Delete your store permanently? This cannot be undone.")) return;
    const response = await fetch("/api/store/delete", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Delete failed" });
      return;
    }
    setFlash({ kind: "success", message: data.message ?? "Store deleted" });
    router.refresh();
  }

  async function handleFaviconUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("favicon") as HTMLInputElement | null;
    if (!fileInput?.files?.[0]) {
      setFlash({ kind: "error", message: "Please select an image file first" });
      return;
    }

    setIsUploadingFavicon(true);
    const response = await fetch("/api/store/favicon/upload", {
      method: "POST",
      body: new FormData(form),
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    setIsUploadingFavicon(false);

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Favicon upload failed" });
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Favicon updated" });
    form.reset();
    router.refresh();
  }

  if (!store) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h2 className="h5 mb-1">Create your store</h2>
          <p className="text-secondary mb-4">You need a store before you can add products.</p>

          {flash && (
            <div className={`alert alert-${flash.kind === "success" ? "success" : "danger"} py-2`} role="alert">
              {flash.message}
            </div>
          )}

          <form onSubmit={(e) => submitForm(e, "/api/store/create")}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="name">Store name</label>
                <input id="name" name="name" type="text" className="form-control" required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="domain">Domain</label>
                <input id="domain" name="domain" type="text" className="form-control" placeholder="mystore.com" required />
                <div className="form-text">Point your domain&apos;s DNS A record to <strong>213.118.195.31</strong>.</div>
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="description">Description</label>
                <textarea id="description" name="description" className="form-control" rows={3} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="ibanNumber">IBAN number</label>
                <input id="ibanNumber" name="ibanNumber" type="text" className="form-control" placeholder="BE68 5390 0754 7034" required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="currency">Currency</label>
                <select id="currency" name="currency" className="form-select" defaultValue="EUR">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="phone">Store phone</label>
                <input id="phone" name="phone" type="tel" className="form-control" required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="vatNumber">VAT number</label>
                <input id="vatNumber" name="vatNumber" type="text" className="form-control" placeholder="BE0123456789" required />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="address">Address</label>
                <input id="address" name="address" type="text" className="form-control" required />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="country">Country</label>
                <input id="country" name="country" type="text" className="form-control" required />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-dark">Create store</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {flash?.kind === "success" && <div className="alert alert-success mb-3">{flash.message}</div>}
      {flash?.kind === "error" && <div className="alert alert-danger mb-3">{flash.message}</div>}

      <div className="row g-3">
        <div className="col-12">
          <form
            onSubmit={(e) => submitForm(e, "/api/store/update")}
            className="settings-section"
          >
            <h2 className="h6 mb-3">General</h2>
            <div className="row g-2">
              <div className="col-md-6">
                <input className="form-control" type="text" name="name" defaultValue={store.name} placeholder="Store name" required />
              </div>
              <div className="col-md-6">
                <input className="form-control" type="text" name="domain" defaultValue={store.domain} placeholder="mystore.com" required />
                <div className="form-text">Point your domain&apos;s DNS A record to <strong>213.118.195.31</strong>.</div>
              </div>
              <div className="col-12">
                <textarea className="form-control" name="description" defaultValue={store.description} rows={3} placeholder="Description" required />
              </div>
              {/* hidden fields to carry unchanged values */}
              <input type="hidden" name="ibanNumber" value={store.ibanNumber} />
              <input type="hidden" name="phone" value={store.phone} />
              <input type="hidden" name="address" value={store.address} />
              <input type="hidden" name="country" value={store.country} />
              <input type="hidden" name="vatNumber" value={store.vatNumber} />
              <input type="hidden" name="currency" value={store.currency} />
            </div>
            <button className="btn btn-dark mt-3" type="submit">Save</button>
          </form>
        </div>

        <div className="col-md-6">
          <form
            onSubmit={(e) => submitForm(e, "/api/store/update")}
            className="settings-section h-100"
          >
            <h2 className="h6 mb-3">Contact</h2>
            <div className="d-grid gap-2">
              <input className="form-control" type="tel" name="phone" defaultValue={store.phone} placeholder="Store phone" required />
              <input className="form-control" type="text" name="address" defaultValue={store.address} placeholder="Address" required />
              <input className="form-control" type="text" name="country" defaultValue={store.country} placeholder="Country" required />
              <input type="hidden" name="name" value={store.name} />
              <input type="hidden" name="description" value={store.description} />
              <input type="hidden" name="ibanNumber" value={store.ibanNumber} />
              <input type="hidden" name="domain" value={store.domain} />
              <input type="hidden" name="vatNumber" value={store.vatNumber} />
              <input type="hidden" name="currency" value={store.currency} />
            </div>
            <button className="btn btn-dark mt-3" type="submit">Save contact</button>
          </form>
        </div>

        <div className="col-md-6">
          <form
            onSubmit={(e) => submitForm(e, "/api/store/update")}
            className="settings-section h-100"
          >
            <h2 className="h6 mb-3">Financial</h2>
            <div className="d-grid gap-2">
              <input className="form-control" type="text" name="ibanNumber" defaultValue={store.ibanNumber} placeholder="IBAN" required />
              <input className="form-control" type="text" name="vatNumber" defaultValue={store.vatNumber} placeholder="VAT number" required />
              <select className="form-select" name="currency" defaultValue={store.currency}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="hidden" name="name" value={store.name} />
              <input type="hidden" name="description" value={store.description} />
              <input type="hidden" name="domain" value={store.domain} />
              <input type="hidden" name="phone" value={store.phone} />
              <input type="hidden" name="address" value={store.address} />
              <input type="hidden" name="country" value={store.country} />
            </div>
            <button className="btn btn-dark mt-3" type="submit">Save financial</button>
          </form>
        </div>

        <div className="col-12">
          <form onSubmit={handleFaviconUpload} className="settings-section">
            <h2 className="h6 mb-3">Store favicon</h2>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div>
                <p className="text-secondary mb-2">Current favicon</p>
                {store.faviconPath ? (
                  <img
                    src={store.faviconPath}
                    alt="Current store favicon"
                    width={48}
                    height={48}
                    className="border rounded"
                  />
                ) : (
                  <div className="border rounded d-flex align-items-center justify-content-center text-secondary" style={{ width: 48, height: 48 }}>
                    None
                  </div>
                )}
              </div>

              <div className="flex-grow-1" style={{ maxWidth: 420 }}>
                <label className="form-label" htmlFor="favicon">Upload favicon</label>
                <input
                  id="favicon"
                  name="favicon"
                  type="file"
                  className="form-control"
                  accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                  required
                />
                <div className="form-text">Recommended: square image, 64x64 or 128x128.</div>
              </div>
            </div>

            <button className="btn btn-dark mt-3" type="submit" disabled={isUploadingFavicon}>
              {isUploadingFavicon ? "Uploading..." : "Save favicon"}
            </button>
          </form>
        </div>

        <div className="col-12">
          <div className="settings-section">
            <h2 className="h6 text-secondary mb-1">Created</h2>
            <p className="mb-0">{new Date(store.createdAt).toLocaleDateString("en-GB")}</p>
          </div>
        </div>

        <div className="col-12">
          <form onSubmit={handleDelete} className="settings-section border-danger-subtle bg-danger-subtle">
            <h2 className="h6 text-danger mb-2">Danger zone</h2>
            <p className="text-secondary mb-2">Delete your store permanently. All associated data will be lost.</p>
            <button className="btn btn-danger" type="submit">Delete store</button>
          </form>
        </div>
      </div>
    </>
  );
}
