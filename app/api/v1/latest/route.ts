import { getSupabaseService } from '@/lib/supabase';
import { badRequest, json, parseSymbols, internalError } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = (url.searchParams.get('base') || '').toUpperCase();
  const symbols = parseSymbols(url.searchParams.get('symbols'));
  if (!base) return badRequest('base is required');

  try {
    const s = getSupabaseService();
    let q = s.from('fx_rates').select('rate_date, base, quote, rate').eq('base', base).order('rate_date', { ascending: false });
    if (symbols?.length) q = q.in('quote', symbols);
    const res = await q.limit(500);
    if (res.error) throw res.error;

    const latestByQuote = new Map<string, { rate: number; rate_date: string }>();
    (res.data ?? []).forEach((r: any) => { if (!latestByQuote.has(r.quote)) latestByQuote.set(r.quote, { rate: Number(r.rate), rate_date: r.rate_date }); });
    const rates: Record<string, number> = {};
    let date = '';
    latestByQuote.forEach((v, k) => { rates[k] = v.rate; if (!date || v.rate_date > date) date = v.rate_date; });
    return json({ success: true, date, base, rates }, 200, 120);
  } catch (e: any) {
    return internalError(e?.message ?? 'failed to load latest');
  }
}
