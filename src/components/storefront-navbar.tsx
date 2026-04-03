"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";

type StorefrontNavbarProps = {
  storeName: string;
};

export function StorefrontNavbar({ storeName }: StorefrontNavbarProps) {
  const { totalQuantity } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = mounted ? totalQuantity : 0;

  return (
    <nav className="navbar bg-white border-bottom sticky-top storefront-navbar">
      <div className="container py-2">
        <Link href="/" className="navbar-brand fw-bold text-dark text-decoration-none mb-0 text-truncate me-2">
          {storeName}
        </Link>

        <div className="d-flex align-items-center gap-2 ms-auto">
          <Link href="/#shop-all" className="btn btn-light btn-sm border d-none d-sm-inline-flex">
            Shop
          </Link>
          <Link
            href="/cart"
            className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1 position-relative"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
            </svg>
            <span>Cart</span>
            {count > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark"
                style={{ fontSize: "0.65rem" }}
              >
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
