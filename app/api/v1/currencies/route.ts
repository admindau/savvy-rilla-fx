import { getSupabaseAnon } from '@/lib/supabase'
import { cacheHeaders, internalError } from '@/lib/util'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAnon()
    const { data, error } = await supabase
      .from('currencies')
      .select('code,name,decimals')
      .eq('active', true)
      .order('code')
    if (error) return internalError(error.message)
    return new Response(JSON.stringify({ success:true, currencies:data }), { headers: cacheHeaders(3600) })
  } catch (e:any) {
    return internalError(e?.message ?? 'error')
  }
}
