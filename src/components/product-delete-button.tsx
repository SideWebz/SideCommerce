"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductDeleteButtonProps = {
  productId: string;
};

export function ProductDeleteButton({ productId }: ProductDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("id", productId);

      const response = await fetch("/api/products/delete", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "Delete failed");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error while deleting product");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <div className="text-danger small mt-1 text-end">{error}</div> : null}
    </div>
  );
}
