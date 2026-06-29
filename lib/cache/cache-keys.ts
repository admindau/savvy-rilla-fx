export const CACHE_TAGS = {
  currencies: "currencies",
  rates: "rates",
  summary: "summary",
  health: "health",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

function normalizeSearchParams(searchParams: URLSearchParams): string {
  const entries: Array<[string, string]> = [];

  searchParams.forEach((value, key) => {
    entries.push([key, value]);
  });

  return entries
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyCompare = leftKey.localeCompare(rightKey);
      return keyCompare === 0 ? leftValue.localeCompare(rightValue) : keyCompare;
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function buildCacheKey(input: {
  namespace: string;
  path: string;
  searchParams?: URLSearchParams;
  varyBy?: Record<string, string | number | boolean | null | undefined>;
}): string {
  const params = input.searchParams ? normalizeSearchParams(input.searchParams) : "";
  const vary = input.varyBy
    ? Object.entries(input.varyBy)
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}:${String(value)}`)
        .join("|")
    : "";

  return [input.namespace, input.path, params, vary].filter(Boolean).join("::");
}

export function buildRequestCacheKey(request: Request, namespace = "api"): string {
  const url = new URL(request.url);

  return buildCacheKey({
    namespace,
    path: url.pathname,
    searchParams: url.searchParams,
  });
}
