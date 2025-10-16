import { getSupabaseService } from '@/lib/supabase'
import { cacheHeaders, badRequest, internalError } from '@/lib/util'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const base = (searchParams.get('base') ?? 'SSP').toUpperCase()
    const symbols = (searchParams.get('symbols') ?? '').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)

    const supabase = getSupabaseService()
    let query = supabase.from('fx_latest').select('rate_date,base,quote,rate').eq('base', base)
    if (symbols.length) query = query.in('quote', symbols)
    const { data, error } = await query
    if (error) return internalError(error.message)

    const map: Record<string, number> = {}
    for (const r of data ?? []) map[r.quote] = Number(r.rate)

    return new Response(JSON.stringify({
      success: true,
      date: (data?.[0]?.rate_date ?? new Date().toISOString().slice(0,10)),
      base, rates: map
    }), { headers: cacheHeaders(1800) })
  } catch (e:any) {
    return internalError(e?.message ?? 'error')
  }
}
