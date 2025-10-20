import { getSupabaseService } from '@/lib/supabase';
import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

type SourceRow = { id: string; key: string };
type RateInJson = {
  rate_date: string;
  base: string;
  quote: string;
  rate: number;
  source_key?: string;
  source_id?: string;
};
type FxRateInsert = {
  rate_date: string;
  base: string;
  quote: string;
  rate: number;
  source_id: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const adminTokenHeader = req.headers.get('x-internal-admin-token')?.trim();
  const adminTokenEnv = process.env.INTERNAL_ADMIN_TOKEN?.trim();
  if (!adminTokenEnv) return json({ success: false, error: { code: 'CONFIG', message: 'INTERNAL_ADMIN_TOKEN missing' } }, 500);
  if (!adminTokenHeader || adminTokenHeader !== adminTokenEnv) return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'invalid token' } }, 401);

  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) return json({ success: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json' } }, 415);

  let rows: RateInJson[];
  try {
    const body = await req.json();
    if (!Array.isArray(body)) throw new Error('Body must be a JSON array');
    rows = body as RateInJson[];
  } catch (e: any) {
    return json({ success: false, error: { code: 'BAD_JSON', message: e?.message ?? 'Invalid JSON' } }, 400);
  }
  if (rows.length === 0) return json({ success: true, inserted: 0 });

  const bad = rows.find(
    (r) => !r || typeof r.rate_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.rate_date) || typeof r.base !== 'string' || typeof r.quote !== 'string' || typeof r.rate !== 'number' || r.rate <= 0 || (!r.source_key && !r.source_id)
  );
  if (bad) return json({ success: false, error: { code: 'VALIDATION', message: 'Each row needs rate_date (YYYY-MM-DD), base, quote, positive rate, and source_key or source_id.' } }, 400);

  const s = getSupabaseService();

  const srcRes = await s.from('sources').select('id,key');
  if (srcRes.error) return json({ success: false, error: { code: 'DB', message: srcRes.error.message } }, 500);
  const idByKey = new Map<string, string>(((srcRes.data ?? []) as SourceRow[]).map((r) => [r.key, r.id]));

  const missingKeys: Set<string> = new Set();
  const toInsert: FxRateInsert[] = rows.map((r) => {
    let source_id = r.source_id;
    if (!source_id && r.source_key) {
      const id = idByKey.get(r.source_key);
      if (!id) missingKeys.add(r.source_key);
      else source_id = id;
    }
    return { rate_date: r.rate_date, base: r.base.toUpperCase(), quote: r.quote.toUpperCase(), rate: r.rate, source_id: source_id as string };
  });

  if (missingKeys.size > 0) return json({ success: false, error: { code: 'UNKNOWN_SOURCE', message: `Unknown source_key(s): ${[...missingKeys].join(', ')}` } }, 400);
  if (toInsert.some((r) => !r.source_id)) return json({ success: false, error: { code: 'VALIDATION', message: 'source_id could not be resolved' } }, 400);

  const table: any = (s.from as any)('fx_rates');
  const { error: upErr, count } = await table.upsert(toInsert, { onConflict: 'rate_date,base,quote,source_id', ignoreDuplicates: false, count: 'exact' });
  if (upErr) return json({ success: false, error: { code: 'DB', message: upErr.message } }, 500);

  try { revalidatePath('/usd-to-ssp'); revalidatePath('/usd-to-sxp'); } catch {}
  return json({ success: true, inserted: count ?? toInsert.length });
}
