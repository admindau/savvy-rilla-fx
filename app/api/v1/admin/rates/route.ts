import { getSupabaseService } from '@/lib/supabase'
import { parseString } from '@fast-csv/parse'
import { revalidatePath } from 'next/cache'
// ...
// at the end of POST handler, when rows are inserted successfully:
revalidatePath('/usd-to-ssp')
revalidatePath('/usd-to-sxp')
return new Response(JSON.stringify({ success:true, inserted: rows.length }), { status:200 })


type RateRow = {
  rate_date: string
  base: string
  quote: string
  rate: number
  source_key: string
}

export const dynamic = 'force-dynamic'

function unauthorized(): Response {
  return new Response(JSON.stringify({ success:false, error:{ code:'UNAUTHORIZED', message:'invalid token' } }), { status:401 })
}

async function resolveSourceId(supabase: ReturnType<typeof getSupabaseService>, key: string): Promise<string> {
  const { data, error } = await supabase.from('sources').select('id').eq('key', key).single()
  if (error || !data) throw new Error(`Unknown source_key: ${key}`)
  return data.id as string
}

function parseCsv(text: string): Promise<RateRow[]> {
  return new Promise<RateRow[]>((resolve, reject) => {
    const rows: RateRow[] = []
    parseString<RateRow, RateRow>(text, { headers: true, trim: true })
      .on('error', (e: unknown) => reject(e instanceof Error ? e : new Error('CSV parse error')))
      .on('data', (r: RateRow) => rows.push(r))
      .on('end', () => resolve(rows))
  })
}

export async function POST(req: Request) {
  const token = req.headers.get('x-internal-admin-token')
  if (!token || token !== process.env.INTERNAL_ADMIN_TOKEN) return unauthorized()

  const contentType = req.headers.get('content-type') ?? ''
  let rows: RateRow[] = []
  const supabase = getSupabaseService()

  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as RateRow[] | RateRow
      rows = Array.isArray(body) ? body : [body]
    } else if (contentType.includes('text/csv')) {
      const csv = await req.text()
      rows = await parseCsv(csv)
    } else {
      return new Response(JSON.stringify({ success:false, error:{ code:'INVALID_PARAMETER', message:'Send JSON or text/csv' } }), { status:400 })
    }

    for (const r of rows) {
      const srcId = await resolveSourceId(supabase, r.source_key)
      const { error } = await supabase.from('fx_rates').upsert({
        rate_date: r.rate_date, base: r.base, quote: r.quote, rate: r.rate, source_id: srcId
      })
      if (error) throw new Error(error.message)
    }

    return new Response(JSON.stringify({ success:true, inserted: rows.length }), { status:200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal error'
    return new Response(JSON.stringify({ success:false, error:{ code:'INTERNAL_ERROR', message: msg } }), { status:500 })
  }
}
