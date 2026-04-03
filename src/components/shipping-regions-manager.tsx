"use client";

import { FormEvent, useEffect, useState } from "react";

type ShippingRegionDto = {
  id: string;
  country: string;
  shippingCost: number;
  freeShippingFrom: number | null;
};

type ApiResult = {
  message?: string;
  regions?: ShippingRegionDto[];
};

type Flash = {
  kind: "success" | "error";
  message: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function ShippingRegionsManager() {
  const [regions, setRegions] = useState<ShippingRegionDto[]>([]);
  const [country, setCountry] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [freeShippingFrom, setFreeShippingFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  async function loadRegions() {
    const response = await fetch("/api/settings/shipping-regions", {
      credentials: "include",
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Unable to load shipping regions" });
      return;
    }

    setRegions(data.regions ?? []);
  }

  useEffect(() => {
    let isMounted = true;

    async function start() {
      setLoading(true);
      const response = await fetch("/api/settings/shipping-regions", {
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as ApiResult;

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Unable to load shipping regions" });
        setLoading(false);
        return;
      }

      setRegions(data.regions ?? []);
      setLoading(false);
    }

    start();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlash(null);
    setSaving(true);

    const response = await fetch("/api/settings/shipping-regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        country,
        shippingCost,
        freeShippingFrom,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Unable to save shipping region" });
      setSaving(false);
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Shipping region saved" });
    setCountry("");
    setShippingCost("");
    setFreeShippingFrom("");
    await loadRegions();
    setSaving(false);
  }

  async function handleDelete(regionId: string) {
    setFlash(null);
    setDeletingId(regionId);

    const response = await fetch("/api/settings/shipping-regions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: regionId }),
    });

    const data = (await response.json().catch(() => ({}))) as ApiResult;

    if (!response.ok) {
      setFlash({ kind: "error", message: data.message ?? "Unable to remove shipping region" });
      setDeletingId(null);
      return;
    }

    setFlash({ kind: "success", message: data.message ?? "Shipping region removed" });
    await loadRegions();
    setDeletingId(null);
  }

  if (loading) {
    return <p className="text-secondary mb-0 mt-4">Loading shipping settings…</p>;
  }

  return (
    <div className="row g-4 mt-1">
      <div className="col-lg-5">
        <div className="settings-section h-100">
          <h2 className="h5 mb-3">Add or update region</h2>
          <form onSubmit={handleSubmit} className="d-grid gap-3" noValidate>
            <div>
              <label className="form-label" htmlFor="country">
                Country
              </label>
              <input
                id="country"
                className="form-control"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Belgium"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="shippingCost">
                Shipping cost (EUR)
              </label>
              <input
                id="shippingCost"
                className="form-control"
                inputMode="decimal"
                value={shippingCost}
                onChange={(event) => setShippingCost(event.target.value)}
                placeholder="6.95"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="freeShippingFrom">
                Free shipping from (EUR)
              </label>
              <input
                id="freeShippingFrom"
                className="form-control"
                inputMode="decimal"
                value={freeShippingFrom}
                onChange={(event) => setFreeShippingFrom(event.target.value)}
                placeholder="75.00"
              />
              <p className="small text-secondary mt-1 mb-0">Leave empty to always charge shipping.</p>
            </div>

            <button type="submit" className="btn btn-dark" disabled={saving}>
              {saving ? "Saving…" : "Save region"}
            </button>
          </form>
        </div>
      </div>

      <div className="col-lg-7">
        {flash?.kind === "success" ? <div className="alert alert-success">{flash.message}</div> : null}
        {flash?.kind === "error" ? <div className="alert alert-danger">{flash.message}</div> : null}

        <div className="settings-section h-100">
          <h2 className="h5 mb-3">Configured shipping regions</h2>

          {regions.length === 0 ? (
            <p className="text-secondary mb-0">No regions configured yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Country</th>
                    <th scope="col">Shipping</th>
                    <th scope="col">Free from</th>
                    <th scope="col" className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => (
                    <tr key={region.id}>
                      <td>{region.country}</td>
                      <td>{formatCurrency(region.shippingCost)}</td>
                      <td>{region.freeShippingFrom === null ? "-" : formatCurrency(region.freeShippingFrom)}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(region.id)}
                          disabled={deletingId === region.id}
                        >
                          {deletingId === region.id ? "Removing…" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
