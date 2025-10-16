import { getSupabaseService } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = req.headers.get('x-internal-admin-token')
  if (!token || token !== process.env.INTERNAL_ADMIN_TOKEN) {
    return new Response(JSON.stringify({ success:false, error:{ code:'UNAUTHORIZED', message:'invalid token' } }), { status:401 })
  }
  // Supabase doesn't allow arbitrary SQL from API; this is a placeholder for RPC or scheduled job.
  // For now return ok; rely on daily refresh job or manual refresh via Supabase SQL editor.
  return new Response(JSON.stringify({ success:true, message:'Trigger a refresh via SQL: REFRESH MATERIALIZED VIEW CONCURRENTLY public.fx_latest;' }), { status:200 })
}
