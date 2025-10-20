import { getSupabaseService } from '@/lib/supabase';
import { badRequest, json, parseSymbols, internalError } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const base = (url.searchParams.get('base') || '').toUpperCase();
  const symbols = parseSymbols(url.searchParams.get('symbols'));
  if (!start || !end || !base || !symbols?.length) return badRequest('start, end, base, and symbols are required');

  try {
    const s = getSupabaseService();
    const res = await s
      .from('fx_rates')
      .select('rate_date, base, quote, rate')
      .eq('base', base)
      .in('quote', symbols)
      .gte('rate_date', start)
      .lte('rate_date', end)
      .order('rate_date', { ascending: true });

    if (res.error) throw res.error;

    const series: Record<string, { date: string; rate: number }[]> = {};
    (res.data ?? []).forEach((r: any) => {
      const k = r.quote;
      if (!series[k]) series[k] = [];
      series[k].push({ date: r.rate_date, rate: Number(r.rate) });
    });

    return json({ success: true, base, start, end, series }, 200, 300);
  } catch (e: any) {
    return internalError(e?.message ?? 'failed to load timeseries');
  }
}
