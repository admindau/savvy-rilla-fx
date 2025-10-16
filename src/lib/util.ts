export function cacheHeaders(seconds: number) {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': `s-maxage=${seconds}, stale-while-revalidate=86400`,
  }
}

export function badRequest(message: string) {
  return new Response(JSON.stringify({ success:false, error:{ code:'INVALID_PARAMETER', message } }), { status:400 })
}

export function internalError(message: string) {
  return new Response(JSON.stringify({ success:false, error:{ code:'INTERNAL_ERROR', message } }), { status:500 })
}
