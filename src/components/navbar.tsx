import Link from "next/link";

type NavbarProps = {
  active: "orders" | "products" | "categories" | "store" | "settings";
};

export function Navbar({ active }: NavbarProps) {
  return (
    <header className="sticky-top bg-white border-bottom">
      <nav className="navbar navbar-expand py-2">
        <div className="container">
          <div className="d-flex align-items-center gap-1">
            <span className="navbar-brand mb-0 h1 fs-6 me-2">SideCommerce</span>
            {(["orders", "products", "categories", "store"] as const).map((page) => (
              <Link
                key={page}
                href={page === "orders" ? "/" : `/${page}`}
                className={`nav-link px-3 py-2 rounded-pill text-capitalize ${
                  active === page ? "active bg-dark text-white" : "text-secondary"
                }`}
              >
                {page}
              </Link>
            ))}
          </div>

          <Link
            href="/settings"
            aria-label="User settings"
            className={`d-flex align-items-center gap-2 text-decoration-none px-2 py-1 rounded-pill border ${
              active === "settings" ? "border-dark bg-dark text-white" : "border-secondary-subtle text-secondary"
            }`}
          >
            <span className="account-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span>Account</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

