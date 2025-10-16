import { getSupabaseService } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabaseService()
  const { data, error } = await supabase
    .from('fx_rates')
    .select('rate_date')
    .order('rate_date',{ ascending:false })
    .limit(1)
  if (error) return new Response(JSON.stringify({ ok:false, error:error.message }), { status:500 })
  const latest_date = data?.[0]?.rate_date ?? null
  return new Response(JSON.stringify({ ok:true, latest_date }), { status:200 })
}
