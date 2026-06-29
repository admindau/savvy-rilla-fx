export function createQueryString(params: object) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber * 1000);

  const asDate = Date.parse(value);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());

  return undefined;
}
