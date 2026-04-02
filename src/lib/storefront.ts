import { prisma } from "@/lib/prisma";

const DEFAULT_PLATFORM_DOMAINS = new Set(["localhost", "127.0.0.1"]);

export function normalizeDomainFromHost(host: string) {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0] ?? "";
  return withoutPort.replace(/\.$/, "");
}

export function isPlatformDomain(domain: string) {
  if (!domain) {
    return true;
  }

  const configuredPlatformDomains = (process.env.PLATFORM_DOMAINS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (configuredPlatformDomains.includes(domain)) {
    return true;
  }

  if (DEFAULT_PLATFORM_DOMAINS.has(domain)) {
    return true;
  }

  return domain.endsWith(".localhost");
}

export function getAuthRedirectTarget(hostHeader: string | null) {
  const domain = normalizeDomainFromHost(hostHeader ?? "");
  if (isPlatformDomain(domain)) {
    return "/";
  }

  return process.env.ADMIN_BASE_URL?.trim() || "http://localhost:3000";
}

/**
 * Resolves a store by its custom domain.
 * Returns null when the domain does not match any store or the database is
 * temporarily unavailable (so the caller can show the platform landing page).
 */
export async function getStoreByDomain(domain: string) {
  if (!domain) return null;

  try {
    return await prisma.store.findFirst({ where: { domain } });
  } catch {
    return null;
  }
}
