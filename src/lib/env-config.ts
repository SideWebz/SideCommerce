function getConfiguredPort() {
  const raw = (process.env.SITE_PORT ?? process.env.PORT ?? "3000").trim();
  return raw || "3000";
}

function isLocalDomain(domain: string) {
  return (
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    domain.endsWith(".localhost") ||
    domain.endsWith(".local") ||
    domain.endsWith(".test") ||
    domain.endsWith(".internal")
  );
}

function sanitizeStorePrefix(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return normalized || "store";
}

export function buildStoreBaseUrl(domain: string) {
  const cleanDomain = domain.trim().toLowerCase();
  if (isLocalDomain(cleanDomain)) {
    return `http://${cleanDomain}:${getConfiguredPort()}`;
  }

  return `https://${cleanDomain}`;
}

export function getAppUrl() {
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }

  return `http://localhost:${getConfiguredPort()}`;
}

export function buildStoreSenderAddress(storeName: string) {
  const baseDomain = (process.env.MAIL_FROM_BASE_DOMAIN ?? "").trim().toLowerCase();
  const localPart = (process.env.MAIL_FROM_LOCAL_PART ?? "no-reply").trim().toLowerCase();

  if (!baseDomain) {
    throw new Error("MAIL_FROM_BASE_DOMAIN is not configured");
  }

  const subdomain = `${sanitizeStorePrefix(storeName)}.${baseDomain}`;
  const fromEmail = `${localPart}@${subdomain}`;

  return `${storeName} <${fromEmail}>`;
}
