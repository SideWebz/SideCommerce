import { createMollieClient } from "@mollie/api-client";

let _client: ReturnType<typeof createMollieClient> | null = null;

export function getMollieClient() {
  if (!_client) {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      throw new Error("MOLLIE_API_KEY is not configured");
    }
    _client = createMollieClient({ apiKey });
  }
  return _client;
}
