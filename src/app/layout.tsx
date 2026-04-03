import type { Metadata } from "next";
import { headers } from "next/headers";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { getStoreByDomain, isPlatformDomain, normalizeDomainFromHost } from "@/lib/storefront";

const ADMIN_FAVICON_PATH = "/sidecommerce-admin-favicon.svg";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    return {
      title: {
        default: "SideCommerce Admin",
        template: "%s | SideCommerce Admin",
      },
      description: "Manage your SideCommerce store.",
      icons: {
        icon: [{ url: ADMIN_FAVICON_PATH, type: "image/svg+xml" }],
        shortcut: ADMIN_FAVICON_PATH,
      },
    };
  }

  const store = await getStoreByDomain(domain);
  const storeFavicon = store?.faviconPath?.trim() || null;

  if (!store) {
    return {
      title: "SideCommerce",
      description: "Build and run your online shop from one platform.",
      icons: {
        icon: [{ url: ADMIN_FAVICON_PATH, type: "image/svg+xml" }],
        shortcut: ADMIN_FAVICON_PATH,
      },
    };
  }

  return {
    title: {
      default: store.name,
      template: `%s | ${store.name}`,
    },
    description: store.description,
    icons: storeFavicon
      ? {
          icon: [{ url: "/api/storefront/favicon" }],
          shortcut: "/api/storefront/favicon",
          apple: "/api/storefront/favicon",
        }
      : {
          icon: [{ url: ADMIN_FAVICON_PATH, type: "image/svg+xml" }],
          shortcut: ADMIN_FAVICON_PATH,
        },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
