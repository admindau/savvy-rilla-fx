// app/api/v1/admin/rates/route.ts
import { NextRequest } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { revalidatePath } from 'next/cache'
// ...
try {
  revalidatePath('/usd-to-ssp')
  revalidatePath('/usd-to-sxp')
} catch {}

export const runtime = 'nodejs'; // ensure not 'edge'

type RateRow = {
  rate_date: string;
  base: string;   // 'SSP' or 'SXP'
  quote: string;  // 'USD', 'EUR', ...
  rate: number;   // 1 base = rate quote
  source_key: string; // 'official_ssp' or 'black_market_ssp'
};

export async function POST(req: NextRequest) {
  // auth
  const token = req.headers.get('x-internal-admin-token');
  if (!token || token !== process.env.INTERNAL_ADMIN_TOKEN) {
    return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'invalid token' } }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';
  const supabase = getSupabaseService();

  let rows: RateRow[] = [];

  // --- parse body ---
  if (contentType.includes('application/json')) {
    try {
      const body = await req.json();
      if (!Array.isArray(body)) throw new Error('Body must be an array of rows');
      rows = body;
    } catch (e: any) {
      return Response.json({ success: false, error: { code: 'BAD_JSON', message: e?.message ?? 'Invalid JSON' } }, { status: 400 });
    }
  } else if (contentType.includes('text/csv')) {
    const text = await req.text();
    // ultra-minimal CSV parser (rate_date,base,quote,rate,source_key)
    const lines = text.trim().split(/\r?\n/);
    const [h, ...data] = lines;
    const headers = h.split(',').map(s => s.trim());
    const idx = (k: string) => headers.indexOf(k);
    if (['rate_date','base','quote','rate','source_key'].some(k => idx(k) === -1)) {
      return Response.json({ success: false, error: { code: 'BAD_CSV', message: 'CSV must include rate_date,base,quote,rate,source_key' } }, { status: 400 });
    }
    rows = data.map(line => {
      const cols = line.split(',').map(s => s.trim());
      return {
        rate_date: cols[idx('rate_date')],
        base: cols[idx('base')],
        quote: cols[idx('quote')],
        rate: Number(cols[idx('rate')]),
        source_key: cols[idx('source_key')],
      } as RateRow;
    });
  } else {
    return Response.json({ success: false, error: { code: 'UNSUPPORTED', message: 'Use application/json or text/csv' } }, { status: 415 });
  }

  if (rows.length === 0) {
    return Response.json({ success: false, error: { code: 'EMPTY', message: 'No rows provided' } }, { status: 400 });
  }

  // --- map source_key -> source_id ---
  const sourceKeys = Array.from(new Set(rows.map(r => r.source_key)));
  const { data: sources, error: srcErr } = await supabase
    .from('sources')
    .select('id,key')
    .in('key', sourceKeys);

  if (srcErr) {
    return Response.json({ success: false, error: { code: 'DB', message: srcErr.message } }, { status: 500 });
  }
  const idByKey = new Map((sources ?? []).map(s => [s.key, s.id]));
  const toInsert = rows.map(r => ({
    rate_date: r.rate_date,
    base: r.base,
    quote: r.quote,
    rate: r.rate,
    source_id: idByKey.get(r.source_key)!,
  }));

  // --- upsert on composite key ---
  const { error } = await supabase
    .from('fx_rates')
    .upsert(toInsert, { onConflict: 'rate_date,base,quote,source_id' });

  if (error) {
    return Response.json({ success: false, error: { code: 'DB', message: error.message } }, { status: 500 });
  }

  // --- best-effort cache revalidation for SEO pages ---
  try {
    revalidatePath('/usd-to-ssp');
    revalidatePath('/usd-to-sxp');
  } catch {
    // ignore; never fail the admin insert because of revalidation
  }

  return Response.json({ success: true, inserted: toInsert.length }, { status: 200 });
}
