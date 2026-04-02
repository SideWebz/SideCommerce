"use client";

import { FormEvent, useMemo, useState } from "react";
import { FlashMessage } from "@/components/flash-message";

type Flash = {
  kind: "success" | "error";
  message: string;
};

type CategoryItem = {
  id: string;
  name: string;
  productCount: number;
};

type CategoriesManagerProps = {
  initialCategories: CategoryItem[];
};

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      setFlash({ kind: "error", message: "Category name is required." });
      return;
    }

    setIsSubmitting(true);
    setFlash(null);

    try {
      const formData = new FormData();
      formData.set("name", newCategoryName.trim());

      const response = await fetch("/api/categories/create", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        category?: { id: string; name: string };
      };

      if (!response.ok || !data.category) {
        setFlash({ kind: "error", message: data.message ?? "Failed to create category." });
        return;
      }

      const createdCategory = {
        id: data.category.id,
        name: data.category.name,
        productCount: 0,
      };

      setCategories((current) => [...current, createdCategory]);
      setNewCategoryName("");
      setFlash({ kind: "success", message: data.message ?? "Category created." });
    } catch {
      setFlash({ kind: "error", message: "Network error while creating category." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveCategory(id: string) {
    if (!editingName.trim()) {
      setFlash({ kind: "error", message: "Category name is required." });
      return;
    }

    setIsSubmitting(true);
    setFlash(null);

    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("name", editingName.trim());

      const response = await fetch("/api/categories/update", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        category?: { id: string; name: string };
      };

      if (!response.ok || !data.category) {
        setFlash({ kind: "error", message: data.message ?? "Failed to update category." });
        return;
      }

      setCategories((current) =>
        current.map((item) => (item.id === id ? { ...item, name: data.category?.name ?? item.name } : item)),
      );
      setEditingId(null);
      setEditingName("");
      setFlash({ kind: "success", message: data.message ?? "Category updated." });
    } catch {
      setFlash({ kind: "error", message: "Network error while updating category." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCategory(id: string) {
    const target = categories.find((category) => category.id === id);
    if (!target) return;

    if (!window.confirm(`Delete category \"${target.name}\"?`)) {
      return;
    }

    setIsSubmitting(true);
    setFlash(null);

    try {
      const formData = new FormData();
      formData.set("id", id);

      const response = await fetch("/api/categories/delete", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFlash({ kind: "error", message: data.message ?? "Failed to delete category." });
        return;
      }

      setCategories((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditingName("");
      }
      setFlash({ kind: "success", message: data.message ?? "Category deleted." });
    } catch {
      setFlash({ kind: "error", message: "Network error while deleting category." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4 d-grid gap-4">
        <div>
          <h2 className="h5 mb-1">Category Management</h2>
          <p className="text-secondary mb-0">Create, rename, and remove product categories.</p>
        </div>

        <FlashMessage flash={flash} />

        <form className="row g-2" onSubmit={createCategory}>
          <div className="col-md-8">
            <input
              className="form-control"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="col-md-4 d-grid">
            <button className="btn btn-dark" type="submit" disabled={isSubmitting}>
              Add category
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Products</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-secondary py-4">
                    No categories yet.
                  </td>
                </tr>
              ) : (
                sortedCategories.map((category) => {
                  const isEditing = editingId === category.id;

                  return (
                    <tr key={category.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="form-control"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            disabled={isSubmitting}
                          />
                        ) : (
                          <span className="fw-semibold">{category.name}</span>
                        )}
                      </td>
                      <td>{category.productCount}</td>
                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-dark"
                                disabled={isSubmitting}
                                onClick={() => saveCategory(category.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={isSubmitting}
                              onClick={() => {
                                setEditingId(category.id);
                                setEditingName(category.name);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={isSubmitting}
                            onClick={() => deleteCategory(category.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
