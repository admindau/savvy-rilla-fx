import { getSupabaseService } from '@/lib/supabase'
import { badRequest, internalError, cacheHeaders } from '@/lib/util'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const base = (searchParams.get('base') ?? 'SSP').toUpperCase()
  const symbols = (searchParams.get('symbols') ?? '').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
  if (!start || !end || symbols.length !== 1) return badRequest('start, end, and exactly one symbol required')

  try {
    const supabase = getSupabaseService()
    const symbol = symbols[0]
    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate_date, rate')
      .eq('base', base)
      .eq('quote', symbol)
      .gte('rate_date', start)
      .lte('rate_date', end)
      .order('rate_date')
    if (error) return internalError(error.message)

    const out: Record<string, number> = {}
    for (const r of data ?? []) out[r.rate_date as any] = Number(r.rate)
    return new Response(JSON.stringify({ success:true, base, symbol, rates: out }), { headers: cacheHeaders(600) })
  } catch (e:any) {
    return internalError(e?.message ?? 'error')
  }
}
