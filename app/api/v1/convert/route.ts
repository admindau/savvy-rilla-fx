import { getSupabaseService } from '@/lib/supabase'
import { badRequest, internalError } from '@/lib/util'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = (searchParams.get('from') ?? '').toUpperCase()
  const to = (searchParams.get('to') ?? '').toUpperCase()
  const amount = Number(searchParams.get('amount') ?? '1')

  if (!from || !to || !Number.isFinite(amount)) return badRequest('from, to, amount required')

  try {
    const supabase = getSupabaseService()
    const { data, error } = await supabase
      .from('fx_latest')
      .select('base,quote,rate')
      .in('quote', [from, to])
      .eq('base', 'SSP')
    if (error) return internalError(error.message)

    const map: Record<string, number> = {}
    for (const r of data ?? []) map[r.quote] = Number(r.rate)
    if (!(from in map) || !(to in map)) return new Response(JSON.stringify({ success:false, error:{ code:'RATE_NOT_FOUND', message:'Missing rate for requested pair(s)' }}), { status:404 })

    const rate = (1 / map[from]) * map[to]
    const result = amount * rate

    return new Response(JSON.stringify({ success:true, query:{ from, to, amount }, info:{ rate }, result }), { status:200 })
  } catch (e:any) {
    return internalError(e?.message ?? 'error')
  }
}
