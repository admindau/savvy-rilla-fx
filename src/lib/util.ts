/** Basic JSON response helpers (cache-aware) */
export function json(
  data: unknown,
  init?: number | ResponseInit,
  cacheSeconds = 300
): Response {
  const status =
    typeof init === 'number' ? init : (init?.status as number | undefined) ?? 200;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=60`,
  };
  if (typeof init === 'object' && init?.headers) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
      headers[k] = v;
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export function jsonNoCache(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Shorthands */
export const ok = (data: unknown, cacheSeconds = 300) => json(data, 200, cacheSeconds);
export const badRequest = (msg: string | object) =>
  jsonNoCache({ success: false, error: { code: 'BAD_REQUEST', message: String(msg) } }, 400);
export const unauthorized = (msg = 'unauthorized') =>
  jsonNoCache({ success: false, error: { code: 'UNAUTHORIZED', message: msg } }, 401);
export const notFound = (msg = 'not found') =>
  jsonNoCache({ success: false, error: { code: 'NOT_FOUND', message: msg } }, 404);
export const internalError = (msg: string) =>
  jsonNoCache({ success: false, error: { code: 'INTERNAL', message: msg } }, 500);

/** Cache headers only (for non-JSON responses if needed) */
export const cacheHeaders = (seconds = 300) => ({
  'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=60`,
});

/** Misc helpers */
export function parseSymbols(q?: string | null): string[] | undefined {
  if (!q) return undefined;
  return q
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function methodGuard(req: Request, allowed: string[]): Response | null {
  if (!allowed.includes(req.method.toUpperCase())) {
    return badRequest(`method not allowed: ${req.method}`);
  }
  return null;
}
